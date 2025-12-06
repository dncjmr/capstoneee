// Function to update queue status
const updateQueueStatus = async (queueNumber, status) => {
  try {
    await axios.put(`http://localhost:5000/api/queue/${queueNumber}`, { status });
    fetchQueues(); // Refresh the queue list after update
  } catch (err) {
    console.error("Error updating queue:", err);
  }
};
