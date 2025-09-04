import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/config';

function TestMongo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const res = await fetch(`${API_BASE_URL}/api/points?name=${query}`);
    const data = await res.json();
    setResults(data);
  };

  return (
    <div>
      <h2>Recherche MongoDB</h2>
      <input
        type="text"
        placeholder="Ex: Nice"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSearch}>Rechercher</button>

      <ul>
        {results.map((point, idx) => (
          <li key={idx}>
            <strong>{point.name}</strong> — x: {point.x}, y: {point.y}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TestMongo;