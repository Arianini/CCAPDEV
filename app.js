const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { engine } = require('express-handlebars');
const moment = require('moment');
const { User, Post } = require('./database'); 
const router = express.Router();
const server = express();
const multer = require('multer');
const mongoose = require('mongoose');  
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
const util = require('util');
server.render = util.promisify(server.render);

// Middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// View Engine
server.engine('hbs', engine({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views', 'partials', 'layouts'),  
    partialsDir: path.join(__dirname, 'views', 'partials'),  
    defaultLayout: 'main', 
    helpers: {
        eq: function (a, b, options) {
            if (typeof options === 'object' && typeof options.fn === 'function') {
                return a === b ? options.fn(this) : options.inverse(this);
            }
            return a === b;
        },
        includes: function (array, value, options) {
            if (!array) return options.inverse(this);
            for (let i = 0; i < array.length; i++) {
                if (typeof array[i] === 'object' && array[i]._id) {
                    if (array[i]._id.toString() === value.toString()) {
                        return options.fn(this);
                    }
                } else if (array[i].toString() === value.toString()) {
                    return options.fn(this);
                }
            }
            return options.inverse(this);
        },
        
        formatDate: function (date, format) {  
            if (!date) return "Invalid Date"; 
            if (typeof format !== "string") format = "YYYY-MM-DD HH:mm:ss"; 
            return moment(date).format(format); 
        }
    },    
    
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,  
        allowProtoMethodsByDefault: true     
    }
}));

server.set('view engine', 'hbs');
server.set('views', path.join(__dirname, 'views'));  

// Serve Static Files
server.use(express.static(path.join(__dirname, 'public')));

server.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('user')
            .populate({
                path: 'comments.user',
                select: 'username profilePic'
            })
            .sort({ createdAt: -1 });

        const userId = req.session.userId;
        const user = userId ? await User.findById(userId).populate('likes') : null;

        const postsWithOwnership = posts.map(post => ({
            ...post.toObject(),
            isOwner: userId && post.user && post.user._id.toString() === userId,
            commentsCount: post.comments ? post.comments.length : 0
        }));

        res.render('index', {
            posts: postsWithOwnership,
            userProfile: user
        });
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Search Route for Finding Posts
server.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const posts = await Post.find({ caption: { $regex: query, $options: 'i' } });
        res.render('search-results', { query, posts }); // Render the search results page
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

//filter to tags
server.get('/api/posts', async (req, res) => {
    try {
        const { tag } = req.query;
        if (!tag) return res.status(400).json({ message: "Tag is required" });

        console.log("Fetching posts with tag:", tag); // Debugging

        const posts = await Post.find({ postTag: tag }) // Find posts with the tag
            .populate('user', 'username')
            .sort({ createdAt: -1 });

        console.log("Posts found:", posts.length); // Debugging

        res.json(posts);
    } catch (error) {
        console.error("Error fetching posts by tag:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


/*
server.get('/', async (req, res) => {
    try {
        const posts = await Post.find().populate('comments.user').sort({ createdAt: -1 });

        const userId = req.session.userId;
        const formattedPosts = posts.map(post => ({
            ...post.toObject(),
            comments: post.comments.map(comment => ({
                ...comment.toObject(),
                isOwner: userId && comment.user && comment.user._id.toString() === userId
            }))
        }));

        res.render('index', { posts: formattedPosts });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});
*/
server.get('/register', (req, res) => {
    res.render('register');
});

server.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send("⚠ Username already exists!");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, userTag: `u/${username}` });

        await newUser.save();
        console.log('New user registered:', newUser); // Log the new user object
        req.session.userId = newUser._id;  

        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

server.get('/login', (req, res) => {
    res.render('login');
});

server.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send("❌ Invalid username or password!");
        }

        req.session.userId = user._id;  
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

server.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId)
            .populate({
                path: 'posts',
                populate: { path: 'comments.user', select: 'username' } 
            })
            .populate('likes')
            .populate('dislikes') 
            .populate('saved') 
            .populate('hidden'); 

        if (!user) {
            return res.redirect('/login');
        }

        res.render('profile', { userProfile: user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

server.get('/profile/posts', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId)
            .populate('likes')
            .populate('dislikes');

        const userPosts = await Post.find({ user: req.session.userId })
            .populate('user')
            .populate({
                path: 'comments.user',
                select: 'username profilePic'
            });

        const postsWithOwnership = userPosts.map(post => ({
            ...post.toObject(),
            isOwner: post.user._id.toString() === req.session.userId,
            commentsCount: post.comments ? post.comments.length : 0
        }));

        res.render('profile/posts', {
            layout: false,
            posts: postsWithOwnership,
            userProfile: user
        });

    } catch (err) {
        console.error('❌ Error fetching user posts for profile:', err);
        res.status(500).send('Internal Server Error');
    }
});

server.get('/profile/likes', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findById(req.session.userId).populate({
            path: 'likes',
            populate: [
                { path: 'user' },
                { path: 'comments.user', select: 'username profilePic' }
            ]
        });

        const likedPosts = user.likes.map(post => ({
            ...post.toObject(),
            isOwner: post.user._id.toString() === req.session.userId,
            commentsCount: post.comments ? post.comments.length : 0
        }));

        res.render('profile/likes', { layout: false, posts: likedPosts, userProfile: user });
    } catch (err) {
        console.error("❌ Error loading liked posts:", err);
        res.status(500).send("Internal Server Error");
    }
});

server.get('/profile/dislikes', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findById(req.session.userId).populate({
            path: 'dislikes',
            populate: [
                { path: 'user' },
                { path: 'comments.user', select: 'username profilePic' }
            ]
        });

        const dislikedPosts = user.dislikes.map(post => ({
            ...post.toObject(),
            isOwner: post.user._id.toString() === req.session.userId,
            commentsCount: post.comments ? post.comments.length : 0
        }));

        res.render('profile/dislikes', { layout: false, posts: dislikedPosts, userProfile: user });
    } catch (err) {
        console.error("❌ Error loading disliked posts:", err);
        res.status(500).send("Internal Server Error");
    }
});


server.post('/like/:postId', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false });
    try {
        const user = await User.findById(req.session.userId);
        const post = await Post.findById(req.params.postId);
        if (!user || !post) return res.status(404).json({ success: false });

        let liked = false;
        let wasDisliked = false;

        if (!user.likes.includes(post._id)) {
            user.likes.push(post._id);
            if (user.dislikes.includes(post._id)) {
                wasDisliked = true;
                user.dislikes = user.dislikes.filter(p => p.toString() !== post._id.toString());
            }
            liked = true;
        } else {
            user.likes = user.likes.filter(p => p.toString() !== post._id.toString());
            liked = false;
        }
        await user.save();

        // Update post counts
        if (liked) {
            await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: 1 } });
            if (wasDisliked) {
                await Post.findByIdAndUpdate(post._id, { $inc: { dislikesCount: -1 } });
            }
        } else {
            await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: -1 } });
        }
        const updatedPost = await Post.findById(post._id);
        res.json({ success: true, liked, likesCount: updatedPost.likesCount, dislikesCount: updatedPost.dislikesCount });
    } catch (err) {
        console.error("Like error:", err);
        res.status(500).json({ success: false });
    }
});

server.post('/dislike/:postId', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false });
    try {
        const user = await User.findById(req.session.userId);
        const post = await Post.findById(req.params.postId);
        if (!user || !post) return res.status(404).json({ success: false });

        let disliked = false;
        let wasLiked = false;

        if (!user.dislikes.includes(post._id)) {
            user.dislikes.push(post._id);
            if (user.likes.includes(post._id)) {
                wasLiked = true;
                user.likes = user.likes.filter(p => p.toString() !== post._id.toString());
            }
            disliked = true;
        } else {
            user.dislikes = user.dislikes.filter(p => p.toString() !== post._id.toString());
            disliked = false;
        }
        await user.save();

        // Update post counts
        if (disliked) {
            await Post.findByIdAndUpdate(post._id, { $inc: { dislikesCount: 1 } });
            if (wasLiked) {
                await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: -1 } });
            }
        } else {
            await Post.findByIdAndUpdate(post._id, { $inc: { dislikesCount: -1 } });
        }
        const updatedPost = await Post.findById(post._id);
        res.json({ success: true, disliked, likesCount: updatedPost.likesCount, dislikesCount: updatedPost.dislikesCount });
    } catch (err) {
        console.error("Dislike error:", err);
        res.status(500).json({ success: false });
    }
});

// Profile Picture Update Route
server.post('/update-profile-pic', upload.single('profilePic'), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        let user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.profilePic = `/uploads/${req.file.filename}`;
        await user.save();

        res.json({ success: true, newProfilePic: user.profilePic });
    } catch (err) {
        console.error("Error updating profile picture:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

server.get('/logout', (req, res) => {
    console.log('Logout route hit');
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.redirect('/login');
    });
});

server.get('/settings', async (req, res) => {
    if (!req.session.userId) {
        console.log('User not logged in, redirecting to login');
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            console.log('User not found, redirecting to login');
            return res.redirect('/login');
        }

        console.log('Current Username:', user.username); // Debugging log
        res.render('settings', { currentUsername: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

server.post('/settings', async (req, res) => {
    const { newUsername } = req.body;

    try {
        const existingUser = await User.findOne({ username: newUsername });
        if (existingUser) {
            return res.status(400).send("⚠ Username already exists!");
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(400).send("❌ User not found!");
        }

        user.username = newUsername;
        user.userTag = `u/${newUsername}`;
        await user.save();

        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

server.post('/create-post', upload.single("image"), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const caption = req.body.caption?.trim() || "";
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    if (!caption && !req.file) {
        return res.status(400).json({ error: "Post must contain either a caption or an image." });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const newPost = new Post({
            user: user._id,
            caption,
            imageUrl: imageUrl || null
        });

        await newPost.save();
        user.posts.push(newPost._id);
        await user.save();

        res.json({ success: true, message: "Post created successfully!" });
    } catch (err) {
        console.error("🚨 Error creating post:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

server.patch('/edit-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send("Unauthorized");
    }

    const { postId, commentId } = req.params;
    const { content } = req.body;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send("Post not found");
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).send("Comment not found");
        }

        if (comment.user.toString() !== req.session.userId) {
            return res.status(403).send("Forbidden: You can only edit your own comments");
        }

        comment.content = content;
        await post.save();

        res.json({ success: true, message: "Comment updated successfully" });
    } catch (err) {
        console.error("Error editing comment:", err);
        res.status(500).send("Internal Server Error");
    }
});

server.patch('/edit-post/:postId', async (req, res) => {
    const { postId } = req.params;
    const { caption } = req.body;

    if (!caption) {
        return res.status(400).json({ error: "Caption cannot be empty!" });
    }

    try {
        const updatedPost = await Post.findByIdAndUpdate(postId, { caption, edited: true }, { new: true });

        if (!updatedPost) {
            return res.status(404).json({ error: "Post not found" });
        }

        res.status(200).json({ success: true, message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

server.delete('/delete-post/:postId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { postId } = req.params;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        if (post.user.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, error: "You can only delete your own posts" });
        }

        await Post.findByIdAndDelete(postId);

        res.json({ success: true, message: "Post deleted successfully" });
    } catch (err) {
        console.error("Error deleting post:", err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

router.post("/create-post", upload.single("image"), async (req, res) => {
    try {
        const { caption } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : ""; 

        if (!caption.trim() && !req.file) {
            return res.status(400).json({ error: "Post must contain either a caption or an image." });
        }

        const newPost = new Post({
            user: req.session.userId, 
            caption,
            imageUrl
        });

        await newPost.save();
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: "Server error while creating post." });
    }
});

server.post('/add-comment/:postId', async (req, res) => {
    try {
        console.log("📨 Received /add-comment request:", req.body);

        if (!req.session.userId) {
            console.error("❌ User not logged in!");
            return res.status(401).json({ error: "You must be logged in to comment." });
        }

        const postId = req.params.postId;
        const { commentText } = req.body;

        if (!postId || !commentText) {
            console.error("❌ Missing postId or commentText!");
            return res.status(400).json({ error: "Missing postId or commentText." });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            console.error("❌ User not found:", req.session.userId);
            return res.status(400).json({ error: "User not found." });
        }

        const newComment = {
            _id: new mongoose.Types.ObjectId(), 
            user: user._id,
            profilePic: user.profilePic,
            content: commentText
        };

        await Post.updateOne(
            { _id: postId },
            { 
                $push: { comments: newComment }
            },
            { runValidators: false }
        );

        console.log("✅ Comment added successfully by:", user.username);

        const renderedComment = await server.render('partials/comment', {
            layout: false,
            _id: newComment._id.toString(),
            postId: postId,
            user: {
                username: user.username,
                profilePic: user.profilePic
            },
            content: commentText
        });
        
        res.status(200).json({
            success: true,
            html: renderedComment
        });        

    } catch (error) {
        console.error("Critical Error in /add-comment route:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

server.post('/render-comment', async (req, res) => {
    try {
        const { postId, commentId, username, content, profilePic } = req.body;

        res.render('partials/comment', {
            layout: false,
            _id: commentId,
            postId: postId,
            user: {
                username: username,
                profilePic: profilePic
            },
            content: content
        });
        

    } catch (error) {
        console.error("Error rendering comment:", error);
        res.status(500).send("Error rendering comment.");
    }
});

server.delete('/delete-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: You must be logged in." });
    }
    const { postId, commentId } = req.params;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }
        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }

        if (comment.user.toString() !== req.session.userId) {
            return res.status(403).json({ error: "You can only delete your own comments." });
        }

        await Post.updateOne(
            { _id: postId },
            { $pull: { comments: { _id: commentId } } }, 
            { runValidators: false }
        );

        return res.json({ success: true, message: "Comment deleted successfully." });

    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

server.put('/edit-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: You must be logged in." });
    }

    const { postId, commentId } = req.params;
    const { updatedContent } = req.body;

    if (!updatedContent.trim()) {
        return res.status(400).json({ error: "Comment content cannot be empty." });
    }

    try {
        const post = await Post.findOne({ _id: postId, "comments._id": commentId });

        if (!post) {
            return res.status(404).json({ error: "Post or Comment not found." });
        }

        const comment = post.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }

        if (comment.user.toString() !== req.session.userId) {
            return res.status(403).json({ error: "Permission denied." });
        }

        await Post.updateOne(
            { _id: postId, "comments._id": commentId },
            { $set: { "comments.$.content": updatedContent } }
        );

        res.json({ success: true, message: "Comment updated successfully.", updatedComment: updatedContent });
    } catch (error) {
        console.error("Error editing comment:", error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

server.post('/like-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: You must be logged in." });
    }
    try {
        const { postId, commentId } = req.params;
        const post = await Post.findById(postId);
        if (!post) {
            console.error("Post not found");
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        const comment = post.comments.id(commentId);
        if (!comment) {
            console.error("Comment not found");
            return res.status(404).json({ success: false, message: "Comment not found" });
        }
        // (With the defaults in the schema, you might not need these checks)
        if (!comment.likes) comment.likes = [];
        if (!comment.dislikes) comment.dislikes = [];
        
        let liked = false;
        const userId = req.session.userId.toString();
        
        if (!comment.likes.includes(userId)) {
            comment.likes.push(userId);
            comment.dislikes = comment.dislikes.filter(uid => uid.toString() !== userId);
            liked = true;
        } else {
            comment.likes = comment.likes.filter(uid => uid.toString() !== userId);
            liked = false;
        }
        post.markModified('comments');

        await post.save();
        console.log("Updated comment:", comment);
        return res.json({
            success: true,
            liked,
            likesCount: comment.likes.length,
            dislikesCount: comment.dislikes.length
        });
    } catch (err) {
        console.error("Error in like-comment endpoint:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

server.post('/dislike-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: You must be logged in." });
    }
    try {
        const { postId, commentId } = req.params;
        const post = await Post.findById(postId);
        if (!post) {
            console.error("Post not found");
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        const comment = post.comments.id(commentId);
        if (!comment) {
            console.error("Comment not found");
            return res.status(404).json({ success: false, message: "Comment not found" });
        }
        // With defaults in the schema these may not be necessary:
        if (!comment.likes) comment.likes = [];
        if (!comment.dislikes) comment.dislikes = [];
        
        let disliked = false;
        const userId = req.session.userId.toString();
        
        if (!comment.dislikes.includes(userId)) {
            // User hasn't disliked yet: add dislike and remove any like
            comment.dislikes.push(userId);
            comment.likes = comment.likes.filter(uid => uid.toString() !== userId);
            disliked = true;
        } else {
            // User has already disliked: remove dislike
            comment.dislikes = comment.dislikes.filter(uid => uid.toString() !== userId);
            disliked = false;
        }
        
        post.markModified('comments');

        await post.save();
        console.log("Updated comment:", comment);
        return res.json({
            success: true,
            disliked,
            likesCount: comment.likes.length,
            dislikesCount: comment.dislikes.length
        });
    } catch (err) {
        console.error("Error in dislike-comment endpoint:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
const port = process.env.PORT || 9090;
server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
