import { state } from './state.js';

export function getPrompt() {
  if (state.configInterface) {
    return `${state.hostname}(config-if)# `;
  }

  if (state.configRouter) {
    return `${state.hostname}(config-router)# `;
  }

  if (state.configMode) {
    return `${state.hostname}(config)# `;
  }

  if (state.privileged) {
    return `${state.hostname}# `;
  }

  return `${state.hostname}> `;
}
