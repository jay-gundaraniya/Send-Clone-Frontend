import React, { useState } from 'react';
import Send from '../components/Send';
import Receive from '../components/Receive';

function FileTransfer() {
  const [activeTab, setActiveTab] = useState('send');
  const [roomId, setRoomId] = useState('');

  const handleSend = () => {
    // Logic to generate roomId if needed
  };

  const handleReceive = (code) => {
    setRoomId(code);
  };

  const handleCancel = () => {
    setRoomId('');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 ${activeTab === 'send' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          Send
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'receive' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('receive')}
        >
          Receive
        </button>
      </div>

      {activeTab === 'send' ? (
        <Send roomId={roomId} onSend={handleSend} onCancel={handleCancel} />
      ) : (
        <Receive roomId={roomId} onReceive={handleReceive} onCancel={handleCancel} />
      )}
    </div>
  );
}

export default FileTransfer; 