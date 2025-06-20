import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';

function Receive({ roomId, onReceive, onCancel }) {
  const [joined, setJoined] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const inputRefs = useRef([]);
  const chunksRef = useRef([]);
  const totalChunksRef = useRef(0);
  const fileNameRef = useRef('');

  // On mount, check for roomId in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    if (urlRoomId && !roomId) {
      onReceive(urlRoomId);
      setOtp(urlRoomId.split('').slice(0, 6));
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (roomId && roomId.length === 6) {
      setOtp(roomId.split(''));
    }
  }, [roomId]);

  const handleOtpChange = (idx, value) => {
    if (!/^[0-9]?$/.test(value)) return; // Only allow single digit numbers
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    const code = newOtp.join('');
    onReceive(code);
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleJoin = () => {
    if (!roomId || roomId.length !== 6) return;
    socket.emit('join-room', roomId);
    setJoined(true);
    socket.emit('receiver-ready', roomId);
    setCanceled(false);
  };

  useEffect(() => {
    const handleFileChunk = ({ fileName, chunk, chunkIndex, totalChunks }) => {
      if (canceled) return;
      if (!receiving) {
        setReceiving(true);
        setProgress(0);
        chunksRef.current = new Array(totalChunks);
        totalChunksRef.current = totalChunks;
        fileNameRef.current = fileName;
      }
      let uint8Arr;
      if (chunk instanceof Uint8Array) {
        uint8Arr = chunk;
      } else if (chunk.data) {
        uint8Arr = new Uint8Array(chunk.data);
      } else {
        uint8Arr = new Uint8Array(chunk);
      }
      chunksRef.current[chunkIndex] = uint8Arr;
      setProgress(((chunkIndex + 1) / totalChunks) * 100);
    };

    const handleFileComplete = ({ fileName }) => {
      if (canceled) {
        chunksRef.current = [];
        totalChunksRef.current = 0;
        fileNameRef.current = '';
        return;
      }
      const allChunks = chunksRef.current;
      const blob = new Blob(allChunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameRef.current || fileName;
      a.click();
      setReceiving(false);
      setProgress(0);
      chunksRef.current = [];
      totalChunksRef.current = 0;
      fileNameRef.current = '';
      setJoined(false);
      onCancel();
    };

    const handleCancelTransfer = () => {
      setReceiving(false);
      setProgress(0);
      chunksRef.current = [];
      totalChunksRef.current = 0;
      fileNameRef.current = '';
      setJoined(false);
      setCanceled(true);
    };

    socket.on('file-chunk', handleFileChunk);
    socket.on('send-file-complete', handleFileComplete);
    socket.on('cancel-transfer', handleCancelTransfer);
    return () => {
      socket.off('file-chunk', handleFileChunk);
      socket.off('send-file-complete', handleFileComplete);
      socket.off('cancel-transfer', handleCancelTransfer);
    };
  }, [receiving, canceled, onCancel]);

  return (
    <div>
      <div className="flex justify-center gap-2 mb-4">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={el => inputRefs.current[idx] = el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="w-10 h-12 text-2xl font-mono text-center border border-gray-400 rounded-md shadow-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
            value={digit}
            onChange={e => handleOtpChange(idx, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(idx, e)}
            disabled={joined && !canceled}
          />
        ))}
      </div>

      <button
        onClick={handleJoin}
        className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-gray-800 transition mb-4"
        disabled={otp.join('').length !== 6 || (joined && !canceled)}
      >
        {joined && !canceled ? 'Waiting for file...' : 'Join & Receive'}
      </button>

      {receiving && !canceled && (
        <div className="mt-4 text-center w-full">
          <p className="text-lg text-black">Receiving file...</p>
          <div className="w-full bg-gray-300 rounded-full h-2.5 mt-2 overflow-hidden">
            <div
              className="bg-black h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">{progress.toFixed(1)}%</p>
        </div>
      )}
      {canceled && (
        <div className="mt-4 text-center text-black font-semibold">Transfer was canceled by sender.</div>
      )}
    </div>
  );
}

export default Receive;
