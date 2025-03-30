function togglePostOptions(postId) {
    const menu = document.getElementById(`options-menu-${postId}`);
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function editPost(postId) {
    document.getElementById(`caption-text-${postId}`).style.display = "none";
    document.getElementById(`edit-container-${postId}`).style.display = "block";
}

function cancelEditPost(postId) {
    document.getElementById(`caption-text-${postId}`).style.display = "block";
    document.getElementById(`edit-container-${postId}`).style.display = "none";
}

async function saveEditPost(postId) {
    const newCaption = document.getElementById(`edit-caption-${postId}`).value.trim();

    if (!newCaption) {
        alert("Caption cannot be empty!");
        return;
    }

    try {
        const response = await fetch(`/edit-post/${postId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caption: newCaption }),
        });

        if (response.ok) {
            document.getElementById(`caption-text-${postId}`).innerText = newCaption + " (Edited)";
            document.getElementById(`caption-text-${postId}`).style.display = "block";
            document.getElementById(`edit-container-${postId}`).style.display = "none";
        } else {
            alert("Failed to update post.");
        }
    } catch (error) {
        console.error("Error updating post:", error);
    }
}

async function deletePost(postId) {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`/delete-post/${postId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
            document.getElementById(`post-${postId}`).remove();
            alert("Post deleted successfully!");
        } else {
            alert("Error deleting post.");
        }
    } catch (error) {
        console.error("Error deleting post:", error);
    }
}

function submitPost() {
    const caption = document.getElementById("post-caption").value.trim();
    const imageInput = document.getElementById("post-image");
    const imageFile = imageInput.files[0];

    if (!caption && !imageFile) {
        alert("You must enter a caption or upload an image.");
        return;
    }

    const formData = new FormData();
    formData.append("caption", caption);
    if (imageFile) {
        formData.append("image", imageFile);
    }

    fetch("/create-post", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload(); 
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error("Error creating post:", err));
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById("image-preview-container");
            const previewImage = document.getElementById("image-preview");

            // Ensure preview is shown only once
            previewImage.src = e.target.result;
            previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
    }
}

document.getElementById("post-image").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById("preview-image").src = e.target.result;
            document.getElementById("preview-image").style.display = "block";
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById("submit-post-btn").addEventListener("click", async function () {
    const caption = document.getElementById("post-caption").value.trim();
    const imageInput = document.getElementById("post-image").files[0];

    if (!caption && !imageInput) {
        alert("Post must contain either a caption or an image.");
        return;
    }

    const formData = new FormData();
    formData.append("caption", caption);
    if (imageInput) {
        formData.append("image", imageInput);
    }

    try {
        const response = await fetch("/create-post", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            location.reload();
        } else {
            alert(result.error || "Failed to create post.");
        }
    } catch (error) {
        console.error("Error creating post:", error);
        alert("An error occurred while creating the post.");
    }
});

// Toggle Profile Picture Menu
function toggleProfilePicMenu() {
    let menu = document.getElementById("profile-pic-menu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Preview Selected Image
function previewProfileImage() {
    let fileInput = document.getElementById("profile-pic-input");
    let previewImage = document.getElementById("preview-image");

    if (fileInput.files && fileInput.files[0]) {
        let reader = new FileReader();
        reader.onload = function (e) {
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// Save New Profile Picture
async function saveProfilePic() {
    let fileInput = document.getElementById("profile-pic-input");

    if (!fileInput.files.length) {
        alert("Please select a file!");
        return;
    }

    let formData = new FormData();
    formData.append("profilePic", fileInput.files[0]);

    let response = await fetch("/update-profile-pic", {
        method: "POST",
        body: formData
    });

    let data = await response.json();
    if (data.success) {
        document.getElementById("profile-image").src = data.newProfilePic;
        toggleProfilePicMenu();
    } else {
        alert("Failed to update profile picture.");
    }
}

// Cancel Profile Picture Update
function cancelProfilePic() {
    document.getElementById("profile-pic-menu").style.display = "none";
}

async function toggleLike(type, postId) {
    try {
        const response = await fetch(`/like/${postId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();
        if (!result.success) {
            alert("Failed to like post.");
        } else {
            updateButtonStates(postId, result.liked, false);
            // Update counts on the page
            const likeCountSpan = document.querySelector(`#like-btn-post-${postId} + .like-count`);
            const dislikeCountSpan = document.querySelector(`#dislike-btn-post-${postId} + .dislike-count`);
            if (likeCountSpan) {
                likeCountSpan.innerText = result.likesCount;
            }
            if (dislikeCountSpan) {
                dislikeCountSpan.innerText = result.dislikesCount;
            }
        }
    } catch (err) {
        console.error("Like error:", err);
        alert("Failed to like post.");
    }
}

async function toggleDislike(type, postId) {
    try {
        const response = await fetch(`/dislike/${postId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();
        if (!result.success) {
            alert("Failed to dislike post.");
        } else {
            updateButtonStates(postId, false, result.disliked);
            const likeCountSpan = document.querySelector(`#like-btn-post-${postId} + .like-count`);
            const dislikeCountSpan = document.querySelector(`#dislike-btn-post-${postId} + .dislike-count`);
            if (likeCountSpan) {
                likeCountSpan.innerText = result.likesCount;
            }
            if (dislikeCountSpan) {
                dislikeCountSpan.innerText = result.dislikesCount;
            }
        }
    } catch (err) {
        console.error("Dislike error:", err);
        alert("Failed to dislike post.");
    }
}

function updateButtonStates(postId, liked, disliked) {
    const likeBtn = document.getElementById(`like-btn-post-${postId}`);
    const dislikeBtn = document.getElementById(`dislike-btn-post-${postId}`);

    if (likeBtn) {
        if (liked) {
            likeBtn.classList.add('active');
            likeBtn.style.background = "#007BFF";
        } else {
            likeBtn.classList.remove('active');
            likeBtn.style.background = "#444";
        }
    }

    if (dislikeBtn) {
        if (disliked) {
            dislikeBtn.classList.add('active');
            dislikeBtn.style.background = "#FF3B30";
        } else {
            dislikeBtn.classList.remove('active');
            dislikeBtn.style.background = "#444";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[id^='like-btn-post-']").forEach(btn => {
        if (btn.classList.contains("active")) {
            btn.style.background = "#007BFF";
        }
    });

    document.querySelectorAll("[id^='dislike-btn-post-']").forEach(btn => {
        if (btn.classList.contains("active")) {
            btn.style.background = "#FF3B30";
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
    likedPosts.forEach(postId => {
        const likeBtn = document.getElementById(`like-btn-post-${postId}`);
        if (likeBtn) {
            likeBtn.classList.add('active');
            likeBtn.style.background = "#007BFF";
        }
    });
});
async function toggleLikeComment(postId, commentId) {
    try {
        const response = await fetch(`/like-comment/${postId}/${commentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();
        if (!result.success) {
            alert("Failed to like comment.");
        } else {
            // Update counts
            document.querySelector(`#like-count-${commentId}`).textContent = result.likesCount;
            document.querySelector(`#dislike-count-${commentId}`).textContent = result.dislikesCount;

            // Update button UI (optional)
            const likeBtn = document.getElementById(`like-btn-comment-${commentId}`);
            const dislikeBtn = document.getElementById(`dislike-btn-comment-${commentId}`);

            if (result.liked) {
                likeBtn.classList.add("active");
                dislikeBtn.classList.remove("active");
            } else {
                likeBtn.classList.remove("active");
            }
        }
    } catch (error) {
        console.error("❌ Error liking comment:", error);
        alert("Failed to like comment.");
    }
}

async function toggleDislikeComment(postId, commentId) {
    try {
        const response = await fetch(`/dislike-comment/${postId}/${commentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();
        if (!result.success) {
            alert("Failed to dislike comment.");
        } else {
            // Update counts
            document.querySelector(`#like-count-${commentId}`).textContent = result.likesCount;
            document.querySelector(`#dislike-count-${commentId}`).textContent = result.dislikesCount;

            // Update button UI
            const likeBtn = document.getElementById(`like-btn-comment-${commentId}`);
            const dislikeBtn = document.getElementById(`dislike-btn-comment-${commentId}`);

            if (result.disliked) {
                dislikeBtn.classList.add("active");
                likeBtn.classList.remove("active");
            } else {
                dislikeBtn.classList.remove("active");
            }
        }
    } catch (error) {
        console.error("❌ Error disliking comment:", error);
        alert("Failed to dislike comment.");
    }
}

async function addComment(postId) {
    const textarea = document.getElementById(`comment-input-${postId}`);
    const commentText = textarea.value.trim();

    if (!commentText) {
        alert("Comment cannot be empty!");
        return;
    }

    try {
        const response = await fetch(`/add-comment/${postId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commentText })
        });

        const result = await response.json();
        if (result.success) {
            const commentsSection = document.getElementById(`comments-${postId}`);
            commentsSection.insertAdjacentHTML("beforeend", result.html);
            // Update comment count
            const commentCountSpan = document.getElementById(`comment-count-${postId}`);
            if (commentCountSpan) {
                const currentCount = parseInt(commentCountSpan.textContent) || 0;
                commentCountSpan.textContent = currentCount + 1;
            }

            textarea.value = "";
        } else {
            alert("Failed to add comment.");
        }
    } catch (error) {
        console.error("❌ Error adding comment:", error);
        alert("An error occurred while adding the comment.");
    }
}

//search script
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector(".search-bar input");
    const searchButton = document.querySelector(".search-bar button");

    if (searchButton && searchInput) {
        searchButton.addEventListener("click", () => {
            const query = searchInput.value.trim();
            if (!query) return;

            // Redirect to /search?q=query
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        });
    }
});
