const SUPABASE_URL = "https://izdosqdrgghnjadihujs.supabase.co";

// Your Supabase publishable key goes here.
// Use the same publishable key from your existing website.
const SUPABASE_KEY = "sb_publishable_ZbUfnH5BeJOO7yRcKgR_fA_2wJxMIjw";
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const ADMIN_UID = "2e4c3e4b-5923-4902-b968-7cb7b545350b";

const loginButton = document.getElementById("loginBtn");
const logoutButton = document.getElementById("logoutBtn");

loginButton.addEventListener("click", adminLogin);
logoutButton.addEventListener("click", adminLogout);

async function adminLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const status = document.getElementById("status");

    status.textContent = "Checking login...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        status.textContent = error.message;
        return;
    }

    if (data.user.id !== ADMIN_UID) {
        await supabaseClient.auth.signOut();
        status.textContent = "Access denied. This account is not an administrator.";
        return;
    }

    document.getElementById("loginSection").hidden = true;
    document.getElementById("dashboard").hidden = false;
    document.getElementById("adminContent").textContent =
        "Admin login successful. Secure dashboard access will be connected next.";
}

async function adminLogout() {
    await supabaseClient.auth.signOut();

    document.getElementById("dashboard").hidden = true;
    document.getElementById("loginSection").hidden = false;
    document.getElementById("status").textContent = "You have logged out.";
}