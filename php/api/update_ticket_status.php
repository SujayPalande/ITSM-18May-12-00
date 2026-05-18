<?php
session_start();
include('../../config/dbconfig.php');

// Check if user is logged in
if(!isset($_SESSION['authenticated'])) {
    header('Location: ../../login.php');
    exit();
}

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Check if required fields are provided
    if(isset($_POST['ticket_id']) && isset($_POST['status_id'])) {
        $ticket_id = mysqli_real_escape_string($connection, $_POST['ticket_id']);
        $status_id = mysqli_real_escape_string($connection, $_POST['status_id']);
        
        // Update ticket status
        $query = "UPDATE tickets SET status_id = '$status_id', updated_at = NOW() WHERE id = '$ticket_id'";
        $result = mysqli_query($connection, $query);
        
        if($result) {
            $_SESSION['message'] = "Ticket status updated successfully.";
            $_SESSION['message_type'] = "success";
        } else {
            $_SESSION['message'] = "Error updating ticket status: " . mysqli_error($connection);
            $_SESSION['message_type'] = "danger";
        }
    } else {
        $_SESSION['message'] = "Missing required fields.";
        $_SESSION['message_type'] = "danger";
    }
    
    // Redirect back to view ticket page
    header("Location: ../../viewticket.php?id=" . $_POST['ticket_id']);
    exit();
}

// If not POST request, redirect to dashboard
header('Location: ../../index.php');
exit();
?>
