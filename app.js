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
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

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
                path: 'comments.user', // Ensure comments also populate user
                select: 'username profilePic'
            })
            .sort({ createdAt: -1 });

        const userId = req.session.userId;
        const postsWithOwnership = posts.map(post => ({
            ...post.toObject(),
            isOwner: userId && post.user && post.user._id.toString() === userId
        }));

        res.render('index', { posts: postsWithOwnership });
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

server.get('/profile/overview', (req, res) => {
    res.render('profile/overview', { layout: false });
});

server.get('/profile/posts', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const userPosts = await Post.find({ user: req.session.userId })
            .populate('user')
            .populate('comments.user');

        const postsWithOwnership = userPosts.map(post => ({
            ...post.toObject(),
            isOwner: post.user._id.toString() === req.session.userId
        }));

        res.render('profile/posts', { layout: false, posts: postsWithOwnership });
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).send('Internal Server Error');
    }
});


server.get('/profile/comments', (req, res) => {
    res.render('profile/comments', { layout: false }); 
});

server.get('/profile/saved', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId).populate('saved');

        if (!user) {
            return res.redirect('/login');
        }

        res.render('profile/saved', { layout: false, posts: user.saved });
    } catch (err) {
        console.error("Error fetching saved posts:", err);
        res.status(500).send("Internal Server Error");
    }
});

server.get('/profile/hidden', (req, res) => {
    res.render('profile/hidden', { layout: false }); 
});

server.get('/profile/likes', (req, res) => {
    res.render('profile/likes', { layout: false }); 
});

server.get('/profile/dislikes', (req, res) => {
    res.render('profile/dislikes', { layout: false }); 
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

server.get('/settings', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('settings');
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
        return res.redirect('/login');
    }

    const caption = req.body.caption ? req.body.caption.trim() : "";
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    if (!caption && !imageUrl) { 
        return res.status(400).json({ error: "Post must contain either a caption or an image." });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(400).send("❌ User not found!");
        }

        const newPost = new Post({
            user: user._id,
            caption,
            imageUrl 
        });

        await newPost.save();
        user.posts.push(newPost._id);
        await user.save();

        res.json({ success: true, message: "Post created successfully!" });
    } catch (err) {
        console.error("Error creating post:", err);
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
    if (!req.session.userId) {
        return res.status(401).json({ error: "You must be logged in to comment." });
    }

    const { postId } = req.params;
    const { commentText } = req.body;  

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(400).json({ error: "User not found." });
        }

        const newComment = {
            user: user._id, 
            content: commentText 
        };

        post.comments.push(newComment);
        await post.save();

        res.status(201).json({
            success: true,
            message: "Comment added successfully!",
            comment: {
                username: user.username, 
                profilePic: user.profilePic, 
                content: commentText
            }
        });

    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


server.delete('/delete-comment/:postId/:commentId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: You must be logged in." });
    }
    const { postId, commentId } = req.params;

    try {
        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $pull: { comments: { _id: commentId, user: req.session.userId } } }, 
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ error: "Post not found." });
        }
        return res.json({ success: true, message: "Comment deleted successfully." });
    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
const port = process.env.PORT || 9090;
server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
