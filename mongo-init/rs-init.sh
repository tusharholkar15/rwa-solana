#!/bin/bash
echo "Waiting for MongoDB to start..."
until mongosh --host mongo --eval 'db.runCommand({ping:1})' &>/dev/null; do
  sleep 1
done

echo "Setting up replica set..."
mongosh --host mongo <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo:27017" }
  ]
})
EOF
echo "Replica set initialized!"
