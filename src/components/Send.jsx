import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';

const CHUNK_SIZE = 64 * 1024;

function Send({ onSend, onCancel }) {
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [sent, setSent] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);
  const canceledRef = useRef(false);
  const [zipBlob, setZipBlob] = useState(null);
  const [zipName, setZipName] = useState('');

  useEffect(() => {
    canceledRef.current = false;
  }, [roomId, files]);

  useEffect(() => {
    if (!roomId || files.length === 0) return;
    const handleReceiverReady = () => {
      if (zipBlob) {
        sendFileAsChunks(zipBlob, zipName);
      } else {
        sendNextFile(0);
      }
    };
    socket.on('receiver-ready', handleReceiverReady);
    return () => {
      socket.off('receiver-ready', handleReceiverReady);
    };
  }, [roomId, files, zipBlob, zipName]);

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendFileAsChunks = (file, fileName) => {
    if (canceledRef.current) return;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let currentChunk = 0;
    const reader = new FileReader();

    const sendChunk = () => {
      if (canceledRef.current) return;
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const blob = file.slice(start, end);
      reader.onload = (e) => {
        if (canceledRef.current) return;
        socket.emit('file-chunk', {
          roomId,
          fileName,
          chunk: new Uint8Array(e.target.result),
          chunkIndex: currentChunk,
          totalChunks
        });
        setProgress(((currentChunk + 1) / totalChunks) * 100);
        currentChunk++;
        if (currentChunk < totalChunks) {
          sendChunk();
        } else {
          socket.emit('send-file-complete', { roomId, fileName });
          setSent(true);
          setTimeout(() => {
            resetAll();
          }, 2000);
        }
      };
      if (!canceledRef.current) {
        reader.readAsArrayBuffer(blob);
      }
    };
    sendChunk();
  };

  const sendNextFile = (fileIdx) => {
    if (canceledRef.current) return;
    if (fileIdx >= files.length) {
      setSent(true);
      setTimeout(() => {
        resetAll();
      }, 2000);
      return;
    }
    setCurrentFileIndex(fileIdx);
    const file = files[fileIdx];
    sendFileAsChunks(file, file.name);
  };

  const handleSend = async () => {
    if (!files.length) return;
    canceledRef.current = false;
    const newRoomId = generateRoomCode();
    setRoomId(newRoomId);
    setCodeGenerated(true);
    socket.emit('join-room', newRoomId);
    if (files.length >= 2) {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.name, file);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      setZipBlob(content);
      setZipName('files-' + newRoomId + '.zip');
    } else {
      setZipBlob(null);
      setZipName('');
    }
    if (onSend) onSend();
  };

  const handleCancel = () => {
    canceledRef.current = true;
    socket.emit('cancel-transfer', roomId);
    if (onCancel) onCancel();
    resetAll();
  };

  const resetAll = () => {
    setFiles([]);
    setRoomId('');
    setSent(false);
    setCodeGenerated(false);
    setCurrentFileIndex(0);
    setProgress(0);
    setDragActive(false);
    setZipBlob(null);
    setZipName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileInputChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  return (
    <>
      {!codeGenerated && (
        <>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`w-full mb-4 p-6 border-2 border-dashed rounded-md text-center transition-colors ${dragActive ? 'border-black bg-gray-100' : 'border-gray-300 bg-gray-100'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            <p className="text-gray-700">Drag & drop files here, or <span className="text-black underline">browse</span></p>
            <input
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              ref={fileRef}
              multiple
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-gray-800 transition mb-4"
            disabled={!files.length || codeGenerated}
          >
            Send
          </button>
        </>
      )}

      {files.length > 0 && !codeGenerated && (
        <div className="mb-4">
          <p className="font-semibold text-black">Files to send:</p>
          <ul className="list-disc list-inside text-gray-700">
            {files.map((file, idx) => (
              <li key={idx}>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</li>
            ))}
          </ul>
        </div>
      )}

      {codeGenerated && roomId && (
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-black">Share this code with the receiver:</p>
          <div className="flex justify-center gap-2 mt-2 mb-2">
            {roomId.split('').map((digit, idx) => (
              <span key={idx} className="w-10 h-12 flex items-center justify-center text-2xl font-mono bg-white border border-gray-400 rounded-md shadow-sm text-black">
                {digit}
              </span>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <QRCodeSVG value={`${window.location.origin}/?tab=receive&roomId=${roomId}`} size={200} />
          </div>
          <p className="mt-2 text-sm text-gray-500">Waiting for receiver to join...</p>
        </div>
      )}
      {codeGenerated && files.length > 0 && !sent && (
        <div className="mt-4 text-center">
          <p className="font-semibold text-black">Sending file {currentFileIndex + 1} of {files.length}:</p>
          <p className="text-black">{files[currentFileIndex]?.name}</p>
          <div className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
            <div
              className="bg-black h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">{progress.toFixed(1)}%</p>
          <button
            onClick={handleCancel}
            className="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Cancel
          </button>
        </div>
      )}
      {sent && (
        <div className="mt-4 text-center text-black font-semibold">All files sent!</div>
      )}
    </>
  );
}

export default Send;
