import React, { useState, useEffect } from 'react';
import Send from '../components/Send';
import Receive from '../components/Receive';

function FileTransfer() {
  const [activeTab, setActiveTab] = useState('send');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    const urlRoomId = params.get('roomId');
    if (urlTab === 'receive') {
      setActiveTab('receive');
    }
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }
  }, []);

  const handleReceive = (code) => setRoomId(code);
  const handleCancel = () => setRoomId('');

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="w-full bg-black py-4 px-6 fixed top-0 left-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <span className="text-white text-2xl font-bold tracking-wide">Send-Clone</span>
        </div>
      </nav>
      <div className="flex items-center justify-center pt-24">
        <div className="bg-gray-200 p-8 rounded-xl w-full max-w-md border border-gray-300">
          <h1 className="text-3xl font-bold text-center text-black mb-6">File Transfer</h1>

          <div className="flex justify-center mb-6 gap-2">
            <button
              onClick={() => setActiveTab('send')}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${activeTab === 'send' ? 'bg-black text-white' : 'bg-white text-black border border-gray-300'}`}
            >
              Send
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${activeTab === 'receive' ? 'bg-black text-white' : 'bg-white text-black border border-gray-300'}`}
            >
              Receive
            </button>
          </div>

          {activeTab === 'send' ? (
            <Send onCancel={handleCancel} />
          ) : (
            <Receive roomId={roomId} onReceive={handleReceive} onCancel={handleCancel} />
          )}
        </div>
      </div>
    </div>
  );
}

export default FileTransfer; 