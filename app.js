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
        const ph = +(6.0 + Math.random() * 2.4).toFixed(2);
        updatePH(ph);

    }, 3000);
}

// ================= UPDATE FUNCTION =================
function updatePH(ph) {

    // update nilai
    document.getElementById("phValue").innerHTML = ph.toFixed(2);
    // update status pH
    const status = document.getElementById("phStatus");


    if (ph < 6.5) {
        status.innerHTML = `
            <i data-lucide="triangle-alert"></i>
            Asam
        `;
        status.className =
            "bg-red-100 text-red-700 px-5 py-2 rounded-full text-sm md:text-base font-semibold flex items-center gap-2";
    }
    else if (ph <= 8.5) {
        status.innerHTML = `
            <i data-lucide="circle-check"></i>
            Normal
        `;
        status.className =
            "bg-green-100 text-green-700 px-5 py-2 rounded-full text-sm md:text-base font-semibold flex items-center gap-2";
    }
    else {
        status.innerHTML = `
            <i data-lucide="triangle-alert"></i>
            Basa
        `;
        status.className =
            "bg-orange-100 text-orange-700 px-5 py-2 rounded-full text-sm md:text-base font-semibold flex items-center gap-2";

    }

    lucide.createIcons();

    // update chart
    chart.data.labels.push(
        new Date().toLocaleTimeString()
    );

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

    if (!mqttConnected) {
        alert("MQTT belum terkoneksi");
        return;
    }

    const amount = document.getElementById("feedAmount").value;
    const payload = JSON.stringify({
        command: "feed",
        amount: Number(amount),
        timestamp: new Date().toISOString()
    });

    client.publish(MQTT_CONFIG.topicFeed, payload);
    console.log(payload);
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


client.on("connect", () => {
    console.log("MQTT Connected");
    mqttConnected = true;

    client.subscribe([
        MQTT_CONFIG.topicPh,
        MQTT_CONFIG.topicStatus
    ]);

    const el = document.getElementById("mqttStatus");

    if (el) {
        el.innerHTML = "● Connected";
        el.classList.remove(
            "text-red-700",
            "bg-red-100",
            "border-red-200"
        );
        el.classList.add(
            "text-green-700",
            "bg-green-100",
            "border-green-200"
        );
    }

});

client.on("disconnect", () => {
    mqttConnected = false;
});

client.on("message", (topic, message) => {
    const data = message.toString();

    // ================= PH SENSOR =================
    if (topic === MQTT_CONFIG.topicPh) {
        const ph = parseFloat(data);
        updatePH(ph);
    }

    // ================= ESP32 STATUS =================
    if (topic === MQTT_CONFIG.topicStatus) {
        const espStatus = document.getElementById("espStatus");
        espStatus.innerHTML = "● Online";
        espStatus.className = "bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200";

        console.log("ESP32 Status:", data);
    }
});

function saveMqttConfig() {
    let broker = document.getElementById("mqttBroker").value;
    console.log(broker);
}