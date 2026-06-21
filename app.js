document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
});

const inputStyle = "border rounded-xl p-3 w-full";
const buttonStyle = "bg-cyan-600 text-white p-3 rounded-xl w-full";

// ===== MODE CONTROL =====
let USE_DUMMY_PH = true;
let mqttConnected = false;

// apply style
document.querySelectorAll(".input").forEach(e => {
    e.classList.add(...inputStyle.split(" "));
});

document.querySelectorAll(".btn").forEach(e => {
    e.classList.add(...buttonStyle.split(" "));
});

// ===== CHART =====
const chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "pH",
            data: [],
            borderWidth: 3
        }]
    },
    options: {
        responsive: true,
        scales: { y: { min: 0, max: 14 } }
    }
});

// ================= DUMMY MODE =================
function startDummy() {
    setInterval(() => {

        // if (mqttConnected) return; // STOP jika MQTT aktif

        const ph = +(6.8 + Math.random() * 1.4).toFixed(2);

        updatePH(ph);

    }, 3000);
}

// ================= UPDATE FUNCTION =================
function updatePH(ph) {
    document.getElementById("phValue").innerHTML = ph.toFixed(2);

    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(ph);

    if (chart.data.labels.length > 15) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

// start dummy
startDummy();


// ================= FEED COMMAND =================
function feedNow() {
    const amount = document.querySelector("#feedAmount")?.value || 0;

    const payload = JSON.stringify({
        command: "feed",
        amount: parseInt(amount),
        timestamp: new Date().toISOString()
    });

    client.publish(MQTT_CONFIG.topicFeed, payload);
    console.log("Published:", payload);
}


// ================= MQTT CONFIG =================
const MQTT_BROKER = "broker.emqx.io";
const MQTT_PORT = "8084";

const MQTT_CONFIG = {
    url: `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`,
    clientId: "web_" + Math.random().toString(16).substr(2, 8),

    topicPh: "fish/ph",
    topicStatus: "fish/status",
    topicFeed: "fish/feed"
};

const client = mqtt.connect(MQTT_CONFIG.url, {
    clientId: MQTT_CONFIG.clientId,
    clean: true,
    connectTimeout: 4000,
});


// ================= MQTT EVENTS =================
client.on("connect", () => {
    console.log("MQTT Connected");

    mqttConnected = true;

    client.subscribe([
        MQTT_CONFIG.topicPh,
        MQTT_CONFIG.topicStatus
    ]);

    const el = document.querySelector(".mqtt-status");
    if (el) {
        el.innerHTML = "● Online";
        el.classList.remove("text-red-600");
        el.classList.add("text-green-600");
        el.classList.remove("bg-red-100");
        el.classList.add("bg-green-100");
    }
});

client.on("disconnect", () => {
    mqttConnected = false;
});

client.on("message", (topic, message) => {

    const data = message.toString();

    if (topic === MQTT_CONFIG.topicPh) {
        const ph = parseFloat(data);
        updatePH(ph);
    }
});