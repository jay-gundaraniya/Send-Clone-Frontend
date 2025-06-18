import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FileTransfer from './pages/FileTransfer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FileTransfer />} />
      </Routes>
    </Router>
  );
}

export default App;
