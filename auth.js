import { CONFIG } from './config.js';

export function initAuth(onReady) {
  gapi.load('client', async () => {
    await gapi.client.init({
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
    });
    onReady();
  });
}
