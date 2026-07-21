import { apiFetch } from "./APIService";

export function getUserProfile(userId) {
  if (!userId) {
    throw new Error("O ID do usuário é obrigatório.");
  }

  return apiFetch(`/api/profile/${userId}`);
}

export function updateUserProfile(userId, profileData) {
  if (!userId) {
    throw new Error("O ID do usuário é obrigatório.");
  }

  return apiFetch(`/api/profile/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(profileData),
  });
}

export function updateUserPassword(userId, passwordData) {
  if (!userId) {
    throw new Error("O ID do usuário é obrigatório.");
  }

  return apiFetch(`/api/profile/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify(passwordData),
  });
}