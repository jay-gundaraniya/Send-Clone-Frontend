import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { QRCodeSVG } from 'qrcode.react';

const CHUNK_SIZE = 64 * 1024; // 64KB

function Send() {
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [sent, setSent] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  useEffect(() => {
    if (!roomId || files.length === 0) return;
    const handleReceiverReady = () => {
      sendNextFile(0);
    };
    socket.on('receiver-ready', handleReceiverReady);
    return () => {
      socket.off('receiver-ready', handleReceiverReady);
    };
    // eslint-disable-next-line
  }, [roomId, files, canceled]);

  const sendNextFile = (fileIdx) => {
    if (canceled) return;
    if (fileIdx >= files.length) {
      setSent(true);
      setTimeout(() => {
        resetAll();
      }, 2000);
      return;
    }
    setCurrentFileIndex(fileIdx);
    const file = files[fileIdx];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let currentChunk = 0;
    const reader = new FileReader();

    const sendChunk = () => {
      if (canceled) return;
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const blob = file.slice(start, end);
      reader.onload = (e) => {
        if (canceled) return;
        socket.emit('file-chunk', {
          roomId,
          fileName: file.name,
          chunk: new Uint8Array(e.target.result),
          chunkIndex: currentChunk,
          totalChunks
        });
        setProgress(((currentChunk + 1) / totalChunks) * 100);
        currentChunk++;
        if (currentChunk < totalChunks) {
          sendChunk();
        } else {
          socket.emit('send-file-complete', { roomId, fileName: file.name });
          sendNextFile(fileIdx + 1);
        }
      };
      reader.readAsArrayBuffer(blob);
    };
    sendChunk();
  };

  const handleSend = () => {
    if (!files.length) return;
    setCanceled(false);
    const newRoomId = generateRoomCode();
    setRoomId(newRoomId);
    setCodeGenerated(true);
    socket.emit('join-room', newRoomId);
    // Wait for receiver-ready before sending files
  };

  const handleCancel = () => {
    setCanceled(true);
    if (roomId) socket.emit('cancel-transfer', roomId);
    resetAll();
  };

  const resetAll = () => {
    setFiles([]);
    setRoomId('');
    setSent(false);
    setCodeGenerated(false);
    setCurrentFileIndex(0);
    setProgress(0);
    setCanceled(false);
    setDragActive(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Drag and drop handlers
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">📤 Send File</h1>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`w-full mb-4 p-6 border-2 border-dashed rounded-md text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
          style={{ cursor: 'pointer' }}
          onClick={() => fileRef.current && fileRef.current.click()}
        >
          <p className="text-gray-600">Drag & drop files here, or <span className="text-blue-600 underline">browse</span></p>
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
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition mb-4"
          disabled={!files.length || codeGenerated}
        >
          Send
        </button>

        {files.length > 0 && !codeGenerated && (
          <div className="mb-4">
            <p className="font-semibold">Files to send:</p>
            <ul className="list-disc list-inside text-gray-700">
              {files.map((file, idx) => (
                <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
              ))}
            </ul>
          </div>
        )}

        {codeGenerated && roomId && (
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold">Share this code with the receiver:</p>
            <div className="text-2xl font-mono bg-gray-200 rounded p-2 mt-2 inline-block">{roomId}</div>
            <div className="mt-4 flex justify-center">
              <QRCodeSVG value={roomId} size={200} />
            </div>
            <p className="mt-2 text-sm text-gray-500">Waiting for receiver to join...</p>
          </div>
        )}
        {codeGenerated && files.length > 0 && !sent && (
          <div className="mt-4 text-center">
            <p className="font-semibold">Sending file {currentFileIndex + 1} of {files.length}:</p>
            <p className="text-blue-700">{files[currentFileIndex]?.name}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">{progress.toFixed(1)}%</p>
            <button
              onClick={handleCancel}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              Cancel
            </button>
          </div>
        )}
        {sent && (
          <div className="mt-4 text-center text-green-600 font-semibold">All files sent!</div>
        )}
      </div>
    </div>
  );
}

export default Send;
