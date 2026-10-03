#!/bin/bash
set -e
echo "Waiting for MongoDB to start..."
until mongosh --host mongo:27017 --eval 'db.runCommand({ping:1})' > /dev/null 2>&1; do
  sleep 1
done

echo "Setting up replica set..."
mongosh --host mongo:27017 --eval '
  try {
    rs.status();
    echo("Replica set already initialized.");
  } catch (e) {
    rs.initiate({
      _id: "rs0",
      members: [{ _id: 0, host: "mongo:27017" }]
    });
    echo("Replica set initialized!");
  }
'

