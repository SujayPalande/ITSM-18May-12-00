<?php
// Detect if we're on a PHP page that should be treated specially
$current_file = basename($_SERVER['PHP_SELF']);
$php_pages = ['viewticket.php', 'edit_ticket.php']; // Add other PHP pages as needed
$is_php_page = in_array($current_file, $php_pages);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ITSM System</title>
    
    <!-- Your existing header content -->
    <!-- Prevent any React/Next.js hydration -->
    <meta name="next-head-count" content="0">
    <!-- Use Bootstrap directly instead of any bundled CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <style>
        body { padding-top: 20px; padding-bottom: 40px; }
        .card { margin-bottom: 20px; box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15); }
        .badge { font-size: 90%; }
    </style>

    <?php if ($is_php_page): ?>
    <!-- For PHP pages, add this meta tag to prevent React from controlling the routing -->
    <meta name="react-router-disable" content="true">
    <?php endif; ?>
</head>
<body>
    <?php if ($is_php_page): ?>
    <script>
    // For PHP pages, prevent React Router from taking over
    window.__DISABLE_REACT_ROUTER__ = true;
    
    // Fix toString error
    if (typeof Object.prototype._original_toString === 'undefined') {
        Object.prototype._original_toString = Object.prototype.toString;
        Object.prototype.toString = function() {
            try {
                return this._original_toString();
            } catch (e) {
                return '[object Object]';
            }
        };
    }
    </script>
    <?php endif; ?>
    
    <?php
    include('config/dbconfig.php');

    // Check if ticket ID is provided
    if(isset($_GET['id'])) {
        $ticket_id = mysqli_real_escape_string($connection, $_GET['id']);
        
        // Get ticket details
        $query = "SELECT t.*, u.name as user_name, s.status_name 
                  FROM tickets t
                  LEFT JOIN users u ON t.user_id = u.id
                  LEFT JOIN status s ON t.status_id = s.id
                  WHERE t.id = '$ticket_id'";
        $result = mysqli_query($connection, $query);
        
        if($result && mysqli_num_rows($result) > 0) {
            $ticket = mysqli_fetch_assoc($result);
            
            // Get comments
            $comments_query = "SELECT c.*, u.name as user_name 
                              FROM comments c
                              LEFT JOIN users u ON c.user_id = u.id
                              WHERE c.ticket_id = '$ticket_id'
                              ORDER BY c.created_at ASC";
            $comments_result = mysqli_query($connection, $comments_query);
    ?>

    <div class="container">
        <div class="row">
            <div class="col-12 mb-3">
                <a href="index.php" class="btn btn-primary">← Back to Dashboard</a>
            </div>
        </div>
        
        <div class="card shadow">
            <div class="card-header bg-primary text-white">
                <h5 class="m-0 font-weight-bold">Ticket Details #<?php echo htmlspecialchars($ticket_id); ?></h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h4><?php echo htmlspecialchars($ticket['title']); ?></h4>
                        <p><strong>Status:</strong> 
                            <span class="badge bg-<?php echo getStatusColor($ticket['status_id']); ?>">
                                <?php echo htmlspecialchars($ticket['status_name']); ?>
                            </span>
                        </p>
                        <p><strong>Created by:</strong> <?php echo htmlspecialchars($ticket['user_name']); ?></p>
                        <p><strong>Created on:</strong> <?php echo date('d M Y H:i', strtotime($ticket['created_at'])); ?></p>
                        <p><strong>Description:</strong></p>
                        <div class="card mb-4">
                            <div class="card-body">
                                <?php echo nl2br(htmlspecialchars($ticket['description'])); ?>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header bg-light">
                                <h6 class="m-0">Ticket Actions</h6>
                            </div>
                            <div class="card-body">
                                <form method="post" action="php/api/update_ticket_status.php">
                                    <input type="hidden" name="ticket_id" value="<?php echo $ticket_id; ?>">
                                    <div class="form-group mb-3">
                                        <label>Update Status</label>
                                        <select name="status_id" class="form-control">
                                            <?php
                                            $status_query = "SELECT * FROM status";
                                            $status_result = mysqli_query($connection, $status_query);
                                            if($status_result) {
                                                while($status = mysqli_fetch_assoc($status_result)) {
                                                    $selected = ($status['id'] == $ticket['status_id']) ? 'selected' : '';
                                                    echo '<option value="'.$status['id'].'" '.$selected.'>'.$status['status_name'].'</option>';
                                                }
                                            }
                                            ?>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-primary btn-sm">Update Status</button>
                                </form>
                                <hr>
                                <a href="edit_ticket.php?id=<?php echo $ticket_id; ?>" class="btn btn-warning btn-sm">Edit Ticket</a>
                                <a href="tickets.php" class="btn btn-secondary btn-sm">Back to All Tickets</a>
                            </div>
                        </div>
                    </div>
                </div>
                
                <hr>
                <h5>Comments</h5>
                
                <div class="comments-section mb-4">
                    <?php 
                    if($comments_result && mysqli_num_rows($comments_result) > 0) {
                        while($comment = mysqli_fetch_assoc($comments_result)) {
                    ?>
                    <div class="card mb-2">
                        <div class="card-header py-2">
                            <strong><?php echo htmlspecialchars($comment['user_name']); ?></strong> - 
                            <?php echo date('d M Y H:i', strtotime($comment['created_at'])); ?>
                        </div>
                        <div class="card-body py-2">
                            <?php echo nl2br(htmlspecialchars($comment['comment'])); ?>
                        </div>
                    </div>
                    <?php
                        }
                    } else {
                        echo '<p>No comments yet.</p>';
                    }
                    ?>
                </div>
                
                <div class="add-comment">
                    <h6>Add Comment</h6>
                    <form method="post" action="php/api/add_comment.php">
                        <input type="hidden" name="ticket_id" value="<?php echo $ticket_id; ?>">
                        <div class="form-group mb-3">
                            <textarea name="comment" class="form-control" rows="3" required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Add Comment</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <?php
        } else {
            echo '<div class="container mt-4"><div class="alert alert-danger">Ticket not found</div></div>';
        }
    } else {
        echo '<div class="container mt-4"><div class="alert alert-danger">No ticket ID provided</div></div>';
    }

    // Helper function to get status color
    function getStatusColor($status_id) {
        switch($status_id) {
            case 1: return 'primary'; // Open
            case 2: return 'warning'; // In Progress
            case 3: return 'success'; // Resolved
            case 4: return 'danger';  // Closed
            default: return 'secondary';
        }
    }
    ?>

    <!-- Simple vanilla JS with no framework dependencies -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Ticket view page loaded successfully');
    });
    </script>

    <!-- Use vanilla Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>