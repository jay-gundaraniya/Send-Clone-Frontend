import React, { useState } from 'react';
import Send from '../components/Send';
import Receive from '../components/Receive';

function FileTransfer() {
  const [activeTab, setActiveTab] = useState('send');
  const [roomId, setRoomId] = useState('');

  const handleReceive = (code) => setRoomId(code);
  const handleCancel = () => setRoomId('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
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
  );
}

export default FileTransfer; 