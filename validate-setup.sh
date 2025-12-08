#!/bin/bash
echo "Verifying Local Setup..."

# Check if Server is running
curl -s http://localhost:5000/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Local Server is RUNNING (Port 5000)"
else
    echo "❌ Local Server is NOT running"
fi

# Check if Frontend is running
curl -s http://localhost:5173/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Frontend is RUNNING (Port 5173)"
else
    echo "❌ Frontend is NOT running"
fi

echo "Done."
