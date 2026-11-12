// Basic JavaScript for the shipment dashboard.
// Shipments are saved in this browser using localStorage.
const table = document.getElementById('shipmentTable');
const search = document.getElementById('search');
const filter = document.getElementById('statusFilter');
const addDialog = document.getElementById('addDialog');
const statusDialog = document.getElementById('statusDialog');

// A new storage key makes this version start fresh.
const storageKey = 'shipmentVisibility12601067Clean';

function allRows() {
    return Array.from(table.querySelectorAll('tr'));
}

function badgeClass(status) {
    return status === 'In Transit' ? 'transit' : status.toLowerCase();
}

function createRow(id, origin, destination, status, eta) {
    const row = document.createElement('tr');
    row.dataset.id = id;
    row.dataset.status = status;
    row.dataset.eta = eta;

    const dateText = new Date(eta + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    [id, origin, destination, status, dateText].forEach((value, index) => {
        const cell = row.insertCell();
        if (index === 3) {
            const badge = document.createElement('span');
            badge.className = 'tag ' + badgeClass(status);
            badge.textContent = value;
            cell.appendChild(badge);
        } else {
            cell.textContent = value;
        }
    });
    return row;
}

function saveShipments() {
    const records = allRows().map(row => ({
        id: row.dataset.id,
        origin: row.cells[1].textContent,
        destination: row.cells[2].textContent,
        status: row.dataset.status,
        eta: row.dataset.eta
    }));
    localStorage.setItem(storageKey, JSON.stringify(records));
}

function loadShipments() {
    table.replaceChildren(); // Start with no sample data.
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return;

    try {
        const records = JSON.parse(saved);
        if (!Array.isArray(records)) return;
        const validStatuses = ['Dispatched', 'In Transit', 'Delayed', 'Delivered'];
        if (!records.every(item => item && typeof item.id === 'string' &&
            typeof item.origin === 'string' && typeof item.destination === 'string' &&
            validStatuses.includes(item.status) && /^\d{4}-\d{2}-\d{2}$/.test(item.eta))) return;

        records.forEach(item => {
            table.appendChild(createRow(item.id, item.origin, item.destination, item.status, item.eta));
        });
    } catch (error) {
        console.log('Could not load saved shipments.');
    }
}

function updateCounts() {
    const rows = allRows();
    const count = status => rows.filter(row => row.dataset.status === status).length;
    const total = rows.length;
    const dispatched = count('Dispatched');
    const transit = count('In Transit');
    const delivered = count('Delivered');
    const delayed = count('Delayed');

    document.getElementById('totalCount').textContent = total;
    document.getElementById('transitCount').textContent = transit;
    document.getElementById('deliveredCount').textContent = delivered;
    document.getElementById('delayedCount').textContent = delayed;

    const groups = [
        ['Dispatched', dispatched], ['Transit', transit],
        ['Delivered', delivered], ['Delayed', delayed]
    ];
    groups.forEach(([name, value]) => {
        document.getElementById('num' + name).textContent = value;
        document.getElementById('bar' + name).style.width = (total ? value / total * 100 : 0) + '%';
    });
}

function clearTracking() {
    document.getElementById('trackingId').textContent = 'None selected';
    document.getElementById('routeFrom').textContent = '—';
    document.getElementById('routeTo').textContent = '—';
    document.getElementById('trackingNote').textContent = 'Add or select a shipment to see its tracking details.';
    document.querySelectorAll('.step').forEach((step, i) => {
        step.classList.remove('done');
        step.querySelector('.dot').textContent = i + 1;
    });
    document.getElementById('updateButton').disabled = true;
    document.getElementById('deleteButton').disabled = true;
}

function trackShipment(row) {
    allRows().forEach(item => item.classList.remove('selected'));
    row.classList.add('selected');

    const status = row.dataset.status;
    document.getElementById('trackingId').textContent = row.dataset.id;
    document.getElementById('routeFrom').textContent = row.cells[1].textContent;
    document.getElementById('routeTo').textContent = row.cells[2].textContent;

    const progress = status === 'Delivered' ? 4 : status === 'Dispatched' ? 1 : 2;
    document.querySelectorAll('.step').forEach((step, i) => {
        step.classList.toggle('done', i < progress);
        step.querySelector('.dot').textContent = i < progress ? '✓' : i + 1;
    });

    const messages = {
        'Dispatched': 'This shipment has left the warehouse.',
        'In Transit': 'This shipment is currently on the way.',
        'Delivered': 'This shipment has reached its destination.',
        'Delayed': 'This shipment is delayed.'
    };
    document.getElementById('trackingNote').textContent = messages[status];
    document.getElementById('updateButton').disabled = false;
    document.getElementById('deleteButton').disabled = false;
}

function filterRows() {
    const word = search.value.toLowerCase().trim();
    let visible = 0;

    allRows().forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(word) &&
            (filter.value === 'All' || row.dataset.status === filter.value);
        row.hidden = !matches;
        if (matches) visible++;
    });

    const message = document.getElementById('noResults');
    message.hidden = visible !== 0;
    message.textContent = allRows().length === 0
        ? 'No shipments yet. Click + Add Shipment to create one.'
        : 'No matching shipments found.';

    const selected = table.querySelector('tr.selected');
    if (visible === 0) {
        allRows().forEach(row => row.classList.remove('selected'));
        clearTracking();
    } else if (!selected || selected.hidden) {
        trackShipment(allRows().find(row => !row.hidden));
    }
}

function updateEmptyAlerts() {
    let message = document.getElementById('emptyAlerts');
    const hasAlerts = document.querySelectorAll('#alertList .alert').length > 0;

    if (!hasAlerts && !message) {
        message = document.createElement('p');
        message.id = 'emptyAlerts';
        message.className = 'small';
        message.textContent = 'No recent activity.';
        document.getElementById('alertList').appendChild(message);
    }
    if (message) message.hidden = hasAlerts;
}

function showAlert(id, message, symbol) {
    document.querySelectorAll('#alertList .alert').forEach(item => {
        if (item.dataset.id === id) item.remove();
    });
    const alertItem = document.createElement('p');
    alertItem.className = 'alert';
    alertItem.dataset.id = id;
    alertItem.textContent = symbol + ' ' + id + ': ' + message;
    document.getElementById('alertList').prepend(alertItem);
    updateEmptyAlerts();
}

search.addEventListener('input', filterRows);
filter.addEventListener('change', filterRows);
table.addEventListener('click', event => {
    const row = event.target.closest('tr');
    if (row) trackShipment(row);
});

// Add a new shipment.
document.getElementById('addButton').addEventListener('click', () => addDialog.showModal());
document.getElementById('cancelButton').addEventListener('click', () => addDialog.close());

document.getElementById('shipmentForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const id = form.elements.id.value.trim().toUpperCase();
    const origin = form.elements.origin.value.trim();
    const destination = form.elements.destination.value.trim();
    const status = form.elements.status.value;
    const eta = form.elements.eta.value;
    const error = document.getElementById('formError');

    if (!id || !origin || !destination || !eta) {
        error.textContent = 'Please fill in all the fields.';
        return;
    }
    if (allRows().some(row => row.dataset.id === id)) {
        error.textContent = 'This Shipment ID already exists. Use a different ID.';
        return;
    }
    error.textContent = '';

    const row = createRow(id, origin, destination, status, eta);
    table.appendChild(row);
    search.value = '';
    filter.value = 'All';
    filterRows();
    updateCounts();
    trackShipment(row);
    saveShipments();

    showAlert(id, 'New shipment added (' + origin + ' to ' + destination + ').', '🔵');
    form.reset();
    addDialog.close();
});

// Change the status of a selected shipment.
document.getElementById('updateButton').addEventListener('click', () => {
    const row = table.querySelector('tr.selected');
    if (!row || row.hidden) return;
    document.getElementById('editShipmentId').textContent = 'Shipment ID: ' + row.dataset.id;
    document.getElementById('newStatus').value = row.dataset.status;
    statusDialog.showModal();
});

document.getElementById('closeStatus').addEventListener('click', () => statusDialog.close());

document.getElementById('statusForm').addEventListener('submit', event => {
    event.preventDefault();
    const row = table.querySelector('tr.selected');
    if (!row) return;

    const newStatus = document.getElementById('newStatus').value;
    row.dataset.status = newStatus;
    const badge = row.cells[3].querySelector('.tag');
    badge.textContent = newStatus;
    badge.className = 'tag ' + badgeClass(newStatus);

    updateCounts();
    search.value = '';
    filter.value = 'All';
    filterRows();
    trackShipment(row);
    saveShipments();

    const symbol = newStatus === 'Delivered' ? '🟢' : newStatus === 'Delayed' ? '🔴' : '🔵';
    showAlert(row.dataset.id, 'Status updated to ' + newStatus + '.', symbol);
    statusDialog.close();
});

// Delete the currently selected shipment.
document.getElementById('deleteButton').addEventListener('click', () => {
    const row = table.querySelector('tr.selected');
    if (!row || row.hidden) return;

    const id = row.dataset.id;
    if (!confirm('Delete shipment ' + id + '?')) return;

    row.remove();
    // Remove this shipment's old alert as well.
    document.querySelectorAll('#alertList .alert').forEach(item => {
        if (item.dataset.id === id) item.remove();
    });

    saveShipments(); // An empty array [] is also saved when the last row is removed.
    updateCounts();
    filterRows();
    updateEmptyAlerts();
});

loadShipments();
updateCounts();
filterRows();
updateEmptyAlerts();
