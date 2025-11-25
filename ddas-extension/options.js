// Saves options to chrome.storage
function save_options() {
  const downloaderId = document.getElementById('downloaderId').value;
  const desktopId = document.getElementById('desktopId').value;
  const networkSharePath = document.getElementById('networkSharePath').value;

  chrome.storage.sync.set({
    downloaderId: downloaderId,
    desktopId: desktopId,
    networkSharePath: networkSharePath
  }, function() {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved!';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    downloaderId: 'default-user',
    desktopId: 'default-desktop',
    networkSharePath: 'C:\\Downloads' // The default we are changing
  }, function(items) {
    document.getElementById('downloaderId').value = items.downloaderId;
    document.getElementById('desktopId').value = items.desktopId;
    document.getElementById('networkSharePath').value = items.networkSharePath;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);