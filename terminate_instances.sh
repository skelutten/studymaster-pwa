#!/bin/bash
# terminate_instances.sh
# Script to find and terminate running instances of the StudyMaster PWA app

# Define the process name to look for
PROCESS_NAME="node"

# Get the current directory (assumed to be the project root)
CURRENT_DIR=$(pwd)

# Find all running instances of the process that are in the project directory
PROCESSES=$(pgrep -f "$PROCESS_NAME" | xargs -I {} ps -p {} -o cmd= | grep -i "studymaster-pwa")

# Check if any instances are running
if [ -n "$PROCESSES" ]; then
    echo "Found $(echo "$PROCESSES" | wc -l) running instances of $PROCESS_NAME related to StudyMaster PWA"

    # Terminate each instance
    pgrep -f "$PROCESS_NAME" | xargs -I {} ps -p {} -o pid= | grep -i "studymaster-pwa" | xargs kill -9

    echo "All StudyMaster PWA instances of $PROCESS_NAME have been terminated."
else
    echo "No running instances of $PROCESS_NAME related to StudyMaster PWA found."
fi