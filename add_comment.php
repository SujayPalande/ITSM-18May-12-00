<?php
session_start();
include('config/dbconfig.php');

// Check if user is logged in
if(!isset($_SESSION['authenticated'])) {
    header('Location: login.php');
    exit();
}

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Check if required fields are provided
    if(isset($_POST['ticket_id']) && isset($_POST['comment']) && !empty($_POST['comment'])) {
        $ticket_id = mysqli_real_escape_string($connection, $_POST['ticket_id']);
        $comment = mysqli_real_escape_string($connection, $_POST['comment']);
        $user_id = $_SESSION['auth_user']['user_id'];
        
        // Insert comment
        $query = "INSERT INTO comments (ticket_id, user_id, comment, created_at) VALUES ('$ticket_id', '$user_id', '$comment', NOW())";
        $result = mysqli_query($connection, $query);
        
        if($result) {
            // Also update the ticket's updated_at timestamp
            mysqli_query($connection, "UPDATE tickets SET updated_at = NOW() WHERE id = '$ticket_id'");
            
            $_SESSION['message'] = "Comment added successfully.";
            $_SESSION['message_type'] = "success";
        } else {
            $_SESSION['message'] = "Error adding comment: " . mysqli_error($connection);
            $_SESSION['message_type'] = "danger";
        }
    } else {
        $_SESSION['message'] = "Comment cannot be empty.";
        $_SESSION['message_type'] = "danger";
    }
    
    // Redirect back to view ticket page
    header("Location: viewticket.php?id=" . $_POST['ticket_id']);
    exit();
}

// If not POST request, redirect to dashboard
header('Location: index.php');
exit();
?>
