import { apiFetch } from "./APIService";

export function getUserProfile() {
  return apiFetch("/api/profile/me");
}

export function updateUserProfile(profileData) {
  return apiFetch("/api/profile/me", {
    method: "PATCH",
    body: JSON.stringify(profileData),
  });
}

export function updateUserPassword(passwordData) {
  return apiFetch("/api/profile/me/password", {
    method: "PATCH",
    body: JSON.stringify(passwordData),
  });
}