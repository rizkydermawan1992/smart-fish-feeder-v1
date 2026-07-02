document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
});

const inputStyle = "border rounded-xl p-3 w-full";
const buttonStyle = "bg-cyan-600 text-white p-3 rounded-xl w-full";

// Endpoint API
const FEEDING_LOG_API = "https://n8n-35yaee339qxb.jkt6.sumopod.my.id/webhook/cfa640b4-a9a6-4ac4-9a13-62d9ab30e2e3";
const FEEDING_SCHEDULE_API = "https://n8n-35yaee339qxb.jkt6.sumopod.my.id/webhook/198c12d3-e46a-4b9d-88c8-026a6d8df663";

const ROWS_PER_PAGE = 5;

// Feeding Log
let feedingLogData = [];
let feedingLogPage = 1;

// Feeding Schedule
let feedingScheduleData = [];
let feedingSchedulePage = 1;


// ===== MODE CONTROL =====
let USE_DUMMY_PH = true;
let mqttConnected = false;

// MQTT GLOBAL
let MQTT_CONFIG = null;
let client = null;

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


// ================= FEED COMMAND =================
function feedNow() {

    if (!mqttConnected) {
        alert("MQTT belum terkoneksi");
        return;
    }

    const amount = document.getElementById("feedAmount").value;

    if (amount === "" || amount <= 0) {
        alert("Jumlah pakan tidak valid");
        return;
    }

    const payload = JSON.stringify({
        mode: "manual",
        amount: Number(amount),
    });

    client.publish(MQTT_CONFIG.topicSensor, payload);
    console.log(payload);
    alert("Perintah pemberian pakan berhasil dikirim\nJumlah: " + amount + " gram");
    // Kosongkan form
    document.getElementById("feedAmount").value = "";
}

// ================ FEEDING LOG ==================
function renderLogPagination() {

    const totalPages = Math.ceil(feedingLogData.length / ROWS_PER_PAGE);
    const div = document.getElementById("feedingLogPagination");

    div.innerHTML = "";

    if (totalPages <= 1) return;

    div.innerHTML += `
    <button
        onclick="changeLogPage(${feedingLogPage - 1})"
        ${feedingLogPage == 1 ? "disabled" : ""}
        class="px-3 py-1 border rounded">
        Prev
    </button>
    `;

    for (let i = 1; i <= totalPages; i++) {

        div.innerHTML += `
        <button
            onclick="changeLogPage(${i})"
            class="px-3 py-1 rounded
            ${i == feedingLogPage ? "bg-cyan-600 text-white" : "border"}">

            ${i}

        </button>
        `;

    }

    div.innerHTML += `
    <button
        onclick="changeLogPage(${feedingLogPage + 1})"
        ${feedingLogPage == totalPages ? "disabled" : ""}
        class="px-3 py-1 border rounded">
        Next
    </button>
    `;

}

function renderFeedingLog() {

    const tbody = document.getElementById("feedingLogBody");



    const start = (feedingLogPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    const pageData = feedingLogData.slice(start, end);
    let html = "";
    let no = start + 1;

    pageData.forEach(item => {

        html += `
                <tr class="border-b">

                    <td class="text-center">
                        ${no++}
                    </td>

                    <td class="text-center py-2">
                        ${item.feeding_time}
                    </td>

                    <td class="text-center">
                        ${item.data_mode}
                    </td>

                    <td class="text-center">
                        ${item.amount} g
                    </td>

                    <td class="text-center">
                        ${item.ph}
                    </td>

                </tr>
        `;
    });

    tbody.innerHTML = html;
    renderLogPagination();

}

function changeLogPage(page) {

    const totalPages = Math.ceil(feedingLogData.length / ROWS_PER_PAGE);

    if (page < 1) return;

    if (page > totalPages) return;

    feedingLogPage = page;

    renderFeedingLog();

}



async function loadFeedingLog() {

    try {

        const response = await fetch(FEEDING_LOG_API, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Gagal mengambil data feeding log");
        }

        const data = await response.json();

        feedingLogData = data;
        feedingLogPage = 1;
        renderFeedingLog();

    }
    catch (err) {
        console.error(err);
    }
}

// ================= FEEDING SCHEDULE ========================
function changeSchedulePage(page) {

    const totalPages =
        Math.ceil(
            feedingScheduleData.length /
            ROWS_PER_PAGE
        );

    if (page < 1) return;

    if (page > totalPages) return;

    feedingSchedulePage = page;
    renderFeedingSchedule();

}

function renderSchedulePagination() {

    const totalPages =
        Math.ceil(
            feedingScheduleData.length /
            ROWS_PER_PAGE
        );

    const div =
        document.getElementById(
            "feedingSchedulePagination"
        );

    div.innerHTML = "";

    if (totalPages <= 1) return;

    div.innerHTML += `
    <button
    onclick="changeSchedulePage(${feedingSchedulePage - 1})"
    ${feedingSchedulePage == 1 ? "disabled" : ""}
    class="px-3 py-1 border rounded">

    Prev

    </button>
    `;

    for (let i = 1; i <= totalPages; i++) {

        div.innerHTML += `

        <button

        onclick="changeSchedulePage(${i})"

        class="px-3 py-1 rounded
        ${i == feedingSchedulePage ? "bg-cyan-600 text-white" : "border"}">

        ${i}

        </button>

        `;

    }

    div.innerHTML += `
    <button
    onclick="changeSchedulePage(${feedingSchedulePage + 1})"
    ${feedingSchedulePage == totalPages ? "disabled" : ""}
    class="px-3 py-1 border rounded">

    Next

    </button>
    `;

}

function renderFeedingSchedule() {

    const tbody = document.getElementById("feedingScheduleBody");
    const start = (feedingSchedulePage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    const pageData = feedingLogData.slice(start, end);
    let html = "";
    let no = start + 1;

    pageData.forEach(item => {

        html += `
                <tr class="border-b">

            <td class="text-center">${no++}</td>

            <td class="text-center py-2">
                ${item.feeding_time}
            </td>

            <td class="text-center">
                ${item.amount} g
            </td>

        </tr>
        `;
    });

    tbody.innerHTML = html;
    renderSchedulePagination();

}

async function loadFeedingSchedule() {
    try {

        const response = await fetch(FEEDING_SCHEDULE_API, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Gagal mengambil data feeding schedule");
        }

        const data = await response.json();

        feedingScheduleData = data;
        feedingSchedulePage = 1;
        renderFeedingSchedule();

    }
    catch (err) {
        console.error(err);
    }


}



// ================= MQTT CONFIG =================
const MQTT_CONFIG_API = "https://n8n-35yaee339qxb.jkt6.sumopod.my.id/webhook/9a1aef5e-bc89-4204-950f-53fd634c20e5";


async function loadMQTTConfig() {
    try {
        const response = await fetch(MQTT_CONFIG_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                request: "mqtt_config"
            })
        });
        const config = await response.json();

        MQTT_CONFIG = {
            url: `wss://${config.broker}:${config.port}/mqtt`,
            clientId: "web_" + Math.random().toString(16).substr(2, 8),
            topicSensor: config.sensor_topic,
            topicStatus: config.status_topic
        };

        document.getElementById("mqttBroker").value = config.broker;
        document.getElementById("mqttPort").value = config.port;
        document.getElementById("sensorTopic").value = config.sensor_topic;
        document.getElementById("statusTopic").value = config.status_topic;

        console.log("MQTT CONFIG", MQTT_CONFIG);
        connectMQTT();
    }
    catch (error) {
        console.log("Config error:", error);
    }
}


function connectMQTT() {
    client = mqtt.connect(
        MQTT_CONFIG.url,
        {
            clientId: MQTT_CONFIG.clientId,
            clean: true,
            connectTimeout: 4000
        }
    );

    client.on("connect", () => {
        console.log("MQTT Connected");

        mqttConnected = true;
        client.subscribe([MQTT_CONFIG.topicSensor, MQTT_CONFIG.topicStatus]);

        const el = document.getElementById("mqttStatus");

        if (el) {
            el.innerHTML = "● Connected";
            el.className = "bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200";
        }
    });

    // DISCONNECT
    client.on("disconnect", () => {
        mqttConnected = false;
        const el = document.getElementById("mqttStatus");

        if (el) {
            el.innerHTML = "● Disconnected";
            el.className = "bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200";
        }

    });

    // MESSAGE
    client.on("message", (topic, message) => {

        const data = JSON.parse(message.toString());
        if (topic === MQTT_CONFIG.topicSensor) {
            // Data sensor
            if (data.mode === "sensor") {
                updatePH(data.ph);
                return;
            }

            // Perintah feeder
            if (data.mode === "manual") {
                console.log("Perintah pakan:", data.amount);
                return;
            }

        }

        // ESP32 STATUS
        if (topic === MQTT_CONFIG.topicStatus) {
            const espStatus = document.getElementById("espStatus");
            const esp32Status = data.status;
            if (esp32Status == "online") {
                espStatus.innerHTML = "● Online";
                espStatus.className = "bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200";
            } else {
                espStatus.innerHTML = "● Offline";
                espStatus.className = "bg-red-100 text-red-700 px-3 py-1 rounded-full border border-green-200";
            }

            console.log("ESP32 Status:", esp32Status);
        }
    });
}


async function saveMqttConfig() {
    let mqtt_broker = document.getElementById("mqttBroker").value;
    let mqtt_port = document.getElementById("mqttPort").value;
    let sensor_topic = document.getElementById("sensorTopic").value;
    let status_topic = document.getElementById("statusTopic").value;

    const payload = {
        broker: mqtt_broker,
        port: Number(mqtt_port),
        sensor_topic: sensor_topic,
        status_topic: status_topic
    };

    console.log("Data dikirim:", payload);

    try {
        const response = await fetch(MQTT_CONFIG_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log("Response API:", result);
        alert("Data Konfigurasi MQTT Berhasil Disimpan!");
    }

    catch (error) {
        console.error("Gagal kirim config:", error);
        alert("Gagal menyimpan MQTT Config");
    }
}

function saveSchedule() {

    const feedTime = document.getElementById("feedTime").value;
    const amount = document.getElementById("scheduleAmount").value;

    // Validasi
    if (feedTime === "" || amount === "") {
        alert("Jam dan jumlah pakan harus diisi");
        return;
    }

    const payload = {
        feeding_time: feedTime,
        amount: Number(amount)
    };

    fetch("https://n8n-35yaee339qxb.jkt6.sumopod.my.id/webhook/35b13c17-d80d-4f82-b732-a21ea11ad191", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Gagal mengirim data");
            }
            return response.json();
        })
        .then(data => {
            console.log("Response:", data.message);

            // Tampilkan pesan dari server
            alert(data.message);

            // Kosongkan form
            document.getElementById("feedTime").value = "";
            document.getElementById("scheduleAmount").value = "";
        })
        .catch(error => {
            console.error(error);
            alert("Terjadi kesalahan saat menyimpan jadwal.");
        });

}

// start dummy
// startDummy();
loadMQTTConfig();

setInterval(() => {
    loadFeedingLog();
    loadFeedingSchedule();
}, 2000);