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
        alert("Post must have either text or an image.");
        return;
    }

    const formData = new FormData();
    formData.append("caption", caption);
    if (imageInput) {
        formData.append("image", imageInput);
    }

    const response = await fetch("/create-post", {
        method: "POST",
        body: formData
    });

    if (response.ok) {
        location.reload();
    } else {
        alert("Failed to create post.");
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
