import React, { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';

const EyeTrackingDashboard = () => {
  const [data, setData] = useState([]);
  const [gazeDistanceData, setGazeDistanceData] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = useCallback((csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index];
      });
      return row;
    });
  }, []);

  const processData = useCallback((parsedData) => {
    setIsProcessing(true);
    setProcessingProgress(0);

    const totalRows = parsedData.length;
    const processChunk = (startIndex) => {
      const chunkSize = 100;
      const endIndex = Math.min(startIndex + chunkSize, totalRows);
      
      const processedChunk = parsedData.slice(startIndex, endIndex).map(row => ({
        timestamp: parseInt(row['Recording.timestamp']),
        participant: row['Participant.name'],
        x: parseFloat(row['Gaze.point.X']),
        y: parseFloat(row['Gaze.point.Y']),
        fixation_duration: parseInt(row['Gaze.event.duration']),
        aoi_name: row['AOI.name']
      })).filter(item => !isNaN(item.x) && !isNaN(item.y));

      setData(prevData => [...prevData, ...processedChunk]);
      setProcessingProgress(Math.round((endIndex / totalRows) * 100));

      if (endIndex < totalRows) {
        setTimeout(() => processChunk(endIndex), 0);
      } else {
        calculateGazeDistance();
        setIsProcessing(false);
      }
    };

    processChunk(0);
  }, []);

  const calculateGazeDistance = useCallback(() => {
    const distanceData = data.slice(1).map((point, index) => {
      const prevPoint = data[index];
      const distance = Math.sqrt(
        Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
      );
      return {
        timestamp: point.timestamp,
        distance: Math.round(distance)
      };
    });
    setGazeDistanceData(distanceData);
  }, [data]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    setIsLoading(true);
    setLoadingProgress(0);
    setData([]);
    setGazeDistanceData([]);

    reader.onload = (e) => {
      const csvText = e.target.result;
      const parsedData = parseCSV(csvText);
      setIsLoading(false);
      processData(parsedData);
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setLoadingProgress(progress);
      }
    };

    reader.readAsText(file);
  }, [parseCSV, processData]);

  const getAOIData = useCallback(() => {
    const aoiCounts = data.reduce((acc, curr) => {
      acc[curr.aoi_name] = (acc[curr.aoi_name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(aoiCounts).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Eye Tracking Dashboard</h1>

      <div className="mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {isLoading && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Loading File: {loadingProgress}%</h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Processing Data: {processingProgress}%</h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${processingProgress}%` }}></div>
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Gaze Plot</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="X" />
                <YAxis type="number" dataKey="y" name="Y" reversed />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Gaze Points" data={data} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="border p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Fixation Duration Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fixation_duration" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">AOI Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getAOIData()} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Gaze Distance Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gazeDistanceData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="distance" stroke="#ffa500" name="Distance (pixels)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EyeTrackingDashboard;