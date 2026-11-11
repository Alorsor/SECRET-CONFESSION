// =====================================================
// SECRET CONFESSIONS - MAIN SCRIPT
// =====================================================

// SUPABASE CONNECTION
const SUPABASE_URL = "https://izdosqdrgghnjadihujs.supabase.co";

// Keep your existing Supabase publishable key.
const SUPABASE_KEY = "sb_publishable_ZbUfnH5BeJOO7yRcKgR_f_A_2wJxMIjw";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const $ = id => document.getElementById(id);

const usernameFromUrl =
    new URLSearchParams(location.search).get("u");

function showStatus(id, message) {
    const element = $(id);
    if (element) element.textContent = message;
}

function makePersonalLink(username) {
    return location.origin + location.pathname +
        "?u=" + encodeURIComponent(username);
}

async function getCurrentUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
}


// =====================================================
// CREATE USERNAME AND PRIVATE ACCOUNT
// =====================================================
async function createAccount() {
    const username = $("username")?.value.trim().toLowerCase();

    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus("authStatus",
            "Use 3–20 letters, numbers or underscores.");
        return;
    }

    showStatus("authStatus", "Creating your personal link...");

    try {
        let user = await getCurrentUser();

        if (!user) {
            const { data, error } =
                await client.auth.signInAnonymously();

            if (error) throw error;
            user = data.user;
        }

        const { data: existing, error: lookupError } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            showAccount(existing.username);
            return;
        }

        const { error } = await client
            .from("profiles")
            .insert({
                id: user.id,
                username: username
            });

        if (error) {
            if (error.code === "23505") {
                throw new Error("That username is already taken. Choose another.");
            }
            throw error;
        }

        showAccount(username);

    } catch (error) {
        console.error(error);
        showStatus("authStatus", error.message);
    }
}


// =====================================================
// CREATE AN ACCOUNT FROM SOMEONE ELSE'S PERSONAL LINK
// =====================================================
async function createVisitorAccount() {
    const username = $("visitorUsername")?.value.trim().toLowerCase();

    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus("visitorAccountStatus",
            "Use 3–20 letters, numbers or underscores.");
        return;
    }

    showStatus("visitorAccountStatus", "Creating your personal link...");

    try {
        let user = await getCurrentUser();

        if (!user) {
            const { data, error } =
                await client.auth.signInAnonymously();

            if (error) throw error;
            user = data.user;
        }

        const { data: existing, error: lookupError } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            showStatus(
                "visitorAccountStatus",
                "You already have a personal link: " +
                makePersonalLink(existing.username)
            );
            return;
        }

        const { error } = await client
            .from("profiles")
            .insert({
                id: user.id,
                username: username
            });

        if (error) {
            if (error.code === "23505") {
                throw new Error("That username is taken. Try another.");
            }
            throw error;
        }

        showStatus(
            "visitorAccountStatus",
            "Your personal link is ready! 💗 " + makePersonalLink(username)
        );

        $("visitorUsername").value = "";

    } catch (error) {
        console.error(error);
        showStatus("visitorAccountStatus", error.message);
    }
}


// =====================================================
// SHOW PERSONAL ACCOUNT
// =====================================================
function showAccount(username) {
    $("authForms")?.classList.add("hidden");
    $("accountPanel")?.classList.remove("hidden");
    $("inboxPanel")?.classList.remove("hidden");
    $("createPostPanel")?.classList.remove("hidden");

    if ($("welcomeUser")) {
        $("welcomeUser").textContent =
            "Welcome, " + username + "! ❤️";
    }

    if ($("personalLink")) {
        $("personalLink").value = makePersonalLink(username);
    }

    loadInbox();
}


// =====================================================
// RESTORE ACCOUNT WHEN WEBSITE OPENS
// =====================================================
async function restoreAccount() {
    try {
        const { data: { session }, error: sessionError } =
            await client.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) return;

        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (error) throw error;

        if (data) showAccount(data.username);

    } catch (error) {
        console.error(error);
    }
}


// =====================================================
// SEND GENERAL ANONYMOUS MESSAGE
// =====================================================
async function sendAnonymousMessage() {
    const content = $("anonymousMessage")?.value.trim();

    if (!usernameFromUrl) {
        showStatus("anonymousStatus",
            "Open someone's personal link first.");
        return;
    }

    if (!content) {
        showStatus("anonymousStatus", "Please write a message.");
        return;
    }

    showStatus("anonymousStatus", "Sending...");

    try {
        const { error } = await client.rpc(
            "submit_anonymous_message",
            {
                p_username: usernameFromUrl,
                p_content: content
            }
        );

        if (error) throw error;

        $("anonymousMessage").value = "";

        showStatus("anonymousStatus",
            "Your anonymous message has been sent! 💗");

    } catch (error) {
        console.error(error);
        showStatus("anonymousStatus", error.message);
    }
}


// =====================================================
// CREATE A MESSAGE CARD FOR SHARING
// =====================================================
async function createMessageCard(item, post) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Your browser could not create the message card.");
    }

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#250b35");
    gradient.addColorStop(1, "#6b1d68");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.fillStyle = "#481b50";
    ctx.beginPath();
    ctx.roundRect(60, 70, 960, 1210, 45);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb5dc";
    ctx.font = "bold 58px Arial";
    ctx.fillText("SECRET CONFESSIONS", 540, 155);

    let messageTop = 360;

    // Add the original picture if the message belongs to a picture.
    if (post && post.image_url) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = post.image_url;

        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(
                new Error("The original picture could not be loaded.")
            );
        });

        const maxWidth = 820;
        const maxHeight = 430;

        const scale = Math.min(
            maxWidth / image.width,
            maxHeight / image.height
        );

        const width = image.width * scale;
        const height = image.height * scale;

        ctx.drawImage(
            image,
            (1080 - width) / 2,
            205 + (maxHeight - height) / 2,
            width,
            height
        );

        messageTop = 710;
    }

    ctx.fillStyle = "#ffe36e";
    ctx.beginPath();
    ctx.roundRect(105, messageTop, 870, 390, 35);
    ctx.fill();

    ctx.fillStyle = "#481b50";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";

    const words = String(item.content || "").split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
        const test = line ? line + " " + word : word;

        if (ctx.measureText(test).width > 760 && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }

    if (line) lines.push(line);

    const visibleLines = lines.slice(0, 5);
    const lineHeight = 62;

    const startY = messageTop + 195 -
        ((visibleLines.length - 1) * lineHeight) / 2;

    visibleLines.forEach((text, index) => {
        ctx.fillText(text, 540, startY + index * lineHeight);
    });

    ctx.fillStyle = "#ffb5dc";
    ctx.font = "30px Arial";
    ctx.fillText(
        "Someone sent an anonymous message ❤️",
        540,
        1165
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Arial";
    ctx.fillText(
        "Create your own anonymous messages!",
        540,
        1220
    );

    ctx.font = "26px Arial";
    ctx.fillText(
        "secret-confession-1.onrender.com",
        540,
        1255
    );

    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
        throw new Error("Could not create the message image.");
    }

    return new File(
        [blob],
        "secret-confession.png",
        { type: "image/png" }
    );
}


// =====================================================
// LOAD PRIVATE INBOX
// =====================================================
async function loadInbox() {
    const box = $("inboxList");

    if (!box) return;

    box.textContent = "Loading messages...";

    try {
        const { data, error } = await client
            .from("messages")
            .select("id, content, created_at, post_id")
            .order("created_at", { ascending: false });

        if (error) throw error;

        box.replaceChildren();

        if (!data || data.length === 0) {
            box.textContent = "No messages yet. Share your link!";
            return;
        }

        for (const item of data) {
            const card = document.createElement("article");
            card.className = "post-card";

            let linkedPost = null;

            if (item.post_id) {
                const { data: post, error: postError } = await client
                    .from("posts")
                    .select("image_url, caption")
                    .eq("id", item.post_id)
                    .maybeSingle();

                if (!postError && post) {
                    linkedPost = post;

                    const picture = document.createElement("img");
                    picture.src = post.image_url;
                    picture.alt = "Picture this message is about";

                    card.appendChild(picture);

                    if (post.caption) {
                        const caption = document.createElement("p");
                        caption.textContent = post.caption;
                        card.appendChild(caption);
                    }
                }
            }

            const message = document.createElement("p");
            message.textContent = "💌 " + item.content;

            const date = document.createElement("small");
            date.textContent =
                new Date(item.created_at).toLocaleString();

            const shareButton = document.createElement("button");
            shareButton.type = "button";
            shareButton.textContent = "🎨 Create & Share Message Card";

            shareButton.onclick = async () => {
                shareButton.disabled = true;
                shareButton.textContent = "Preparing card...";

                try {
                    const imageFile =
                        await createMessageCard(item, linkedPost);

                    if (
                        navigator.share &&
                        navigator.canShare &&
                        navigator.canShare({ files: [imageFile] })
                    ) {
                        await navigator.share({
                            files: [imageFile],
                            title: "Anonymous Message",
                            text:
                                "Create your own anonymous messages: " +
                                "https://secret-confession-1.onrender.com"
                        });
                    } else {
                        const url = URL.createObjectURL(imageFile);
                        const link = document.createElement("a");

                        link.href = url;
                        link.download = imageFile.name;

                        document.body.appendChild(link);
                        link.click();
                        link.remove();

                        setTimeout(
                            () => URL.revokeObjectURL(url),
                            1500
                        );

                        alert(
                            "Your message card has been downloaded. " +
                            "Upload it to WhatsApp Status."
                        );
                    }

                } catch (error) {
                    if (error.name !== "AbortError") {
                        console.error(error);
                        alert(error.message ||
                            "Could not share the message card.");
                    }
                } finally {
                    shareButton.disabled = false;
                    shareButton.textContent =
                        "🎨 Create & Share Message Card";
                }
            };

            card.append(message, date, shareButton);
            box.appendChild(card);
        }

    } catch (error) {
        console.error(error);
        box.textContent = error.message || "Could not load your messages.";
    }
}


// =====================================================
// PUBLISH A PICTURE
// =====================================================
async function publishPost() {
    const file = $("postPhoto")?.files?.[0];
    const caption = $("postCaption")?.value.trim() || "";

    if (!file) {
        showStatus("postStatus", "Please choose a picture.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showStatus("postStatus",
            "Picture must be smaller than 5 MB.");
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showStatus("postStatus", "Choose JPG, PNG or WEBP.");
        return;
    }

    try {
        const user = await getCurrentUser();

        if (!user) {
            showStatus("postStatus",
                "Please create your username first.");
            return;
        }

        showStatus("postStatus", "Uploading picture...");

        const safeName = file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        const path = user.id + "/" +
            crypto.randomUUID() + "-" + safeName;

        const { error: uploadError } = await client.storage
            .from("community-posts")
            .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = client.storage
            .from("community-posts")
            .getPublicUrl(path);

        const { error } = await client
            .from("posts")
            .insert({
                author_id: user.id,
                caption: caption,
                image_url: urlData.publicUrl
            });

        if (error) throw error;

        $("postCaption").value = "";
        $("postPhoto").value = "";

        showStatus("postStatus",
            "Your picture is now published! ❤️");

        await loadPosts();

    } catch (error) {
        console.error(error);
        showStatus("postStatus",
            error.message || "Picture could not be published.");
    }
}


// =====================================================
// LOAD COMMUNITY POSTS AND PERSONAL-LINK POSTS
// =====================================================
async function loadPosts() {
    const box = $("postsList");

    if (!box) return;

    box.textContent = "Loading pictures...";

    try {
        let query = client
            .from("posts")
            .select("id, author_id, caption, image_url, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        if (usernameFromUrl) {
            const { data: owner, error: ownerError } = await client
                .from("profiles")
                .select("id")
                .eq("username", usernameFromUrl.toLowerCase())
                .maybeSingle();

            if (ownerError) throw ownerError;

            if (!owner) {
                box.textContent =
                    "This personal link could not be found.";
                return;
            }

            query = query.eq("author_id", owner.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        box.replaceChildren();

        if (!data || data.length === 0) {
            box.textContent =
                "No pictures have been published yet.";
            return;
        }

        const currentUser = await getCurrentUser();

        for (const post of data) {
            const card = document.createElement("article");
            card.className = "post-card";

            const image = document.createElement("img");
            image.src = post.image_url;
            image.alt = "Published picture";

            const caption = document.createElement("p");
            caption.textContent = post.caption || "";

            card.append(image, caption);

            // PRIVATE ANONYMOUS MESSAGE ABOUT THIS PICTURE
            if (usernameFromUrl) {
                const privateInput =
                    document.createElement("textarea");

                privateInput.maxLength = 2000;
                privateInput.placeholder =
                    "Send a private anonymous message about this picture...";

                const privateButton =
                    document.createElement("button");

                privateButton.type = "button";
                privateButton.textContent =
                    "🔒 Send Private Anonymous Message";

                const privateFeedback =
                    document.createElement("p");

                privateFeedback.className = "status";

                privateButton.onclick = async () => {
                    const content = privateInput.value.trim();

                    if (!content) {
                        privateFeedback.textContent =
                            "Write a message first.";
                        return;
                    }

                    privateFeedback.textContent =
                        "Sending privately...";

                    privateButton.disabled = true;

                    try {
                        const { error } = await client.rpc(
                            "submit_anonymous_message",
                            {
                                p_username: usernameFromUrl,
                                p_content: content,
                                p_post_id: post.id
                            }
                        );

                        if (error) throw error;

                        privateInput.value = "";
                        privateFeedback.textContent =
                            "Your private anonymous message has been sent! ❤️";

                    } catch (error) {
                        console.error(error);
                        privateFeedback.textContent =
                            error.message || "Message could not be sent.";

                    } finally {
                        privateButton.disabled = false;
                    }
                };

                card.append(
                    privateInput,
                    privateButton,
                    privateFeedback
                );
            }

            // DELETE BUTTON ONLY FOR THE PICTURE OWNER
            if (currentUser && currentUser.id === post.author_id) {
                const deleteButton =
                    document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "🗑️ Delete Picture";
                deleteButton.className = "secondary";

                deleteButton.onclick = async () => {
                    if (!confirm(
                        "Are you sure you want to delete this picture?"
                    )) {
                        return;
                    }

                    deleteButton.textContent = "Deleting...";
                    deleteButton.disabled = true;

                    try {
                        const { error } = await client
                            .from("posts")
                            .delete()
                            .eq("id", post.id);

                        if (error) throw error;

                        alert("Picture deleted successfully!");
                        await loadPosts();

                    } catch (error) {
                        console.error(error);
                        alert(
                            "Could not delete picture: " + error.message
                        );

                        deleteButton.disabled = false;
                        deleteButton.textContent =
                            "🗑️ Delete Picture";
                    }
                };

                card.appendChild(deleteButton);
            }

            // EXISTING PUBLIC COMMENTS
            const comments = document.createElement("div");
            comments.className = "comments";

            const result = await client
                .from("post_comments")
                .select("comment")
                .eq("post_id", post.id)
                .order("created_at");

            if (result.error) {
                comments.textContent = "Comments unavailable.";
            } else {
                result.data.forEach(row => {
                    const p = document.createElement("p");
                    p.textContent = "💬 " + row.comment;
                    comments.appendChild(p);
                });
            }

            const input = document.createElement("textarea");
            input.maxLength = 1000;
            input.placeholder = "Write an anonymous comment...";

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Comment anonymously";

            const feedback = document.createElement("p");
            feedback.className = "status";

            button.onclick = async () => {
                const comment = input.value.trim();

                if (!comment) {
                    feedback.textContent = "Write a comment first.";
                    return;
                }

                feedback.textContent = "Posting...";
                button.disabled = true;

                try {
                    const { error } = await client.rpc(
                        "submit_post_comment",
                        {
                            p_post_id: post.id,
                            p_comment: comment
                        }
                    );

                    if (error) throw error;

                    input.value = "";
                    feedback.textContent = "Comment posted!";
                    await loadPosts();

                } catch (error) {
                    console.error(error);
                    feedback.textContent =
                        error.message || "Comment could not be posted.";

                } finally {
                    button.disabled = false;
                }
            };

            card.append(comments, input, button, feedback);
            box.appendChild(card);
        }

    } catch (error) {
        console.error(error);
        box.textContent =
            error.message || "Could not load pictures.";
    }
}


// =====================================================
// COPY PERSONAL LINK
// =====================================================
async function copyPersonalLink() {
    const linkInput = $("personalLink");
    const link = linkInput?.value.trim();

    if (!link) {
        alert("Your personal link is not ready yet.");
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(link);
        } else {
            linkInput.focus();
            linkInput.select();

            const copied = document.execCommand("copy");

            if (!copied) {
                throw new Error(
                    "Copy is not supported by this browser."
                );
            }
        }

        alert("Your link has been copied!");

    } catch (error) {
        console.error(error);
        prompt("Copy your personal link:", link);
    }
}


// =====================================================
// SHARE PERSONAL LINK THROUGH WHATSAPP
// =====================================================
function sharePersonalLink() {
    const link = $("personalLink")?.value.trim();

    if (!link) {
        alert("Your personal link is not ready yet.");
        return;
    }

    const message =
        "Send me an anonymous message: " + link;

    const whatsappUrl =
        "https://wa.me/?text=" + encodeURIComponent(message);

    window.open(whatsappUrl, "_blank", "noopener");
}


// =====================================================
// SHARE A SELECTED PICTURE TO WHATSAPP STATUS
// =====================================================
async function shareSelectedPictureToStatus() {
    const photoInput = $("statusPhoto");
    const statusMessage = $("statusShareMessage");
    const file = photoInput?.files?.[0];

    if (!statusMessage) return;

    if (!file) {
        statusMessage.textContent =
            "Please choose a picture first.";
        return;
    }

    if (!file.type.startsWith("image/")) {
        statusMessage.textContent =
            "Please select a valid picture.";
        return;
    }

    try {
        const shareFile = new File(
            [file],
            file.name,
            { type: file.type }
        );

        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files: [shareFile] })
        ) {
            await navigator.share({
                files: [shareFile],
                title: "Share a Picture",
                text: "Sharing from Secret Confessions ❤️"
            });

            statusMessage.textContent =
                "Choose WhatsApp, then select My Status.";

        } else {
            const url = URL.createObjectURL(file);
            const link = document.createElement("a");

            link.href = url;
            link.download = file.name;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(
                () => URL.revokeObjectURL(url),
                1500
            );

            statusMessage.textContent =
                "Picture downloaded. Open WhatsApp Status and upload it.";
        }

    } catch (error) {
        if (error.name === "AbortError") {
            statusMessage.textContent = "Sharing cancelled.";
        } else {
            console.error(error);
            statusMessage.textContent =
                error.message || "Sharing failed. Please try again.";
        }
    }
}


// =====================================================
// CONNECT BUTTONS
// =====================================================
function connectButton(id, handler) {
    const button = $(id);

    if (button) {
        button.addEventListener("click", handler);
    }
}

connectButton("signupBtn", createAccount);
connectButton("createVisitorAccountBtn", createVisitorAccount);
connectButton("sendAnonymousBtn", sendAnonymousMessage);
connectButton("refreshInboxBtn", loadInbox);
connectButton("refreshPostsBtn", loadPosts);
connectButton("publishPostBtn", publishPost);
connectButton("copyLinkBtn", copyPersonalLink);
connectButton("shareLinkBtn", sharePersonalLink);
connectButton("statusShareBtn", shareSelectedPictureToStatus);


// =====================================================
// OPEN PERSONAL MESSAGE PAGE
// =====================================================
if (usernameFromUrl) {
    $("homePage")?.classList.add("hidden");
    $("publicLinkPage")?.classList.remove("hidden");

    if ($("recipientHeading")) {
        $("recipientHeading").textContent =
            "Welcome to " + usernameFromUrl + "'s page! 💗";
    }
}


// =====================================================
// START WEBSITE
// =====================================================
loadPosts();
restoreAccount();