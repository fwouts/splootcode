import 'tslib'
import runtime from 'serviceworker-webpack-plugin/lib/runtime';

export enum FrameState {
  DEAD = 0,
  LOADING,
  SW_INSTALLING,
  LIVE,
  UNMOUNTED
}

let state = FrameState.LOADING;

function sendHeartbeat() {
  sendToParent({type: 'heartbeat', data: {state: state}});
}

function setState(newState: FrameState) {
  let isNew = (state !== newState);
  state = newState;
  if (isNew) {
    sendHeartbeat();
  }
}

let serviceWorkerRegistration : ServiceWorkerRegistration;
const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN;

function sendServiceWorkerPort(serviceWorkerRegistration: ServiceWorkerRegistration) {
  const messageChannel = new MessageChannel();
  parent.postMessage({'type': 'serviceworkerport'}, PARENT_TARGET_DOMAIN, [messageChannel.port1]);
  serviceWorkerRegistration.active.postMessage({'type': 'parentwindowport'}, [messageChannel.port2]);
}

function sendToParent(payload) {
  parent.postMessage(payload, PARENT_TARGET_DOMAIN);
}

function sendToServiceWorker(payload) {
  serviceWorkerRegistration.active.postMessage(payload);
}

function handleMessageFromServiceWorker(event: MessageEvent) {
  let data = event.data;
  switch (data.type) {
    case 'loaded':
      sendToParent(data);
      break;
    default:
      console.warn('Unrecognised message recieved:', event.data);
  }
}

function handleMessage(event: MessageEvent) {
  let data = event.data;
  if (data.type.startsWith('webpack')) {
    // Ignore webpack devserver
    return;
  }
  switch (data.type) {
    case 'heartbeat':
      sendHeartbeat();
      break;
    case 'nodetree':
      // Proxy to service worker directly.
      sendToServiceWorker(data);
      break;
    default:
      console.warn('Unrecognised message recieved:', event.data);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleMessageFromServiceWorker);
  window.addEventListener('load', function() {
    window.addEventListener("message", handleMessage, false);
    runtime.register().then(function(registration: ServiceWorkerRegistration) {
      serviceWorkerRegistration = registration;
      if (registration.installing) {
        setState(FrameState.SW_INSTALLING);
        registration.installing.addEventListener('statechange', (event) => {
          // @ts-ignore
          if (event.target.state === 'activated') {
            setState(FrameState.LIVE);
          }
        });
      } else if (registration.waiting) {
        setState(FrameState.LIVE);
      } else if (registration.active) {
        setState(FrameState.LIVE);
      }
    }, function(err) {
      // registration failed :(
      console.warn('ServiceWorker registration failed: ', err);
    });
  });
}