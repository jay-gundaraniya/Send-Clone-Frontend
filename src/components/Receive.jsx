import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';

function Receive() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);
  const chunksRef = useRef([]);
  const totalChunksRef = useRef(0);
  const fileNameRef = useRef('');

  const handleJoin = () => {
    if (!roomId) return;
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
      if (canceled) return;
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
      setRoomId('');
    };

    const handleCancelTransfer = () => {
      setReceiving(false);
      setProgress(0);
      chunksRef.current = [];
      totalChunksRef.current = 0;
      fileNameRef.current = '';
      setJoined(false);
      setRoomId('');
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
  }, [receiving]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-green-600 mb-6">📥 Receive File</h1>

        <input
          type="text"
          placeholder="Enter Code from Sender"
          className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={joined}
        />

        <button
          onClick={handleJoin}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition mb-4"
          disabled={!roomId || joined}
        >
          {joined ? 'Waiting for file...' : 'Join & Receive'}
        </button>

        {receiving && (
          <div className="mt-4 text-center">
            <p className="text-lg">Receiving file...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">{progress.toFixed(1)}%</p>
          </div>
        )}
        {canceled && (
          <div className="mt-4 text-center text-red-600 font-semibold">Transfer was canceled by sender.</div>
        )}
      </div>
    </div>
  );
}

export default Receive;
