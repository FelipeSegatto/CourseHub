export const profileAvatars = {
  student: [
    {
      key: "student-01",
      src: "/avatars/student-01.webp",
      alt: "Avatar de estudante 1",
    },
    {
      key: "student-02",
      src: "/avatars/student-02.webp",
      alt: "Avatar de estudante 2",
    },
    {
      key: "student-03",
      src: "/avatars/student-03.webp",
      alt: "Avatar de estudante 3",
    },
    {
      key: "student-04",
      src: "/avatars/student-04.p",
      alt: "Avatar de estudante 4",
    },
  ],

  teacher: [
    {
      key: "teacher-01",
      src: "/avatars/teacher-01.webp",
      alt: "Avatar de professor 1",
    },
    {
      key: "teacher-02",
      src: "/avatars/teacher-02.webp",
      alt: "Avatar de professor 2",
    },
    {
      key: "teacher-03",
      src: "/avatars/teachers/teacher-03.png",
      alt: "Avatar de professor 3",
    },
    {
      key: "teacher-04",
      src: "/avatars/teachers/teacher-04.png",
      alt: "Avatar de professor 4",
    },
  ],

  admin: [
    {
      key: "admin-01",
      src: "/avatars/admin-01.webp",
      alt: "Avatar de administrador 1",
    },
    {
      key: "admin-02",
      src: "/avatars/admins/admin-02.png",
      alt: "Avatar de administrador 2",
    },
    {
      key: "admin-03",
      src: "/avatars/admins/admin-03.png",
      alt: "Avatar de administrador 3",
    },
    {
      key: "admin-04",
      src: "/avatars/admins/admin-04.png",
      alt: "Avatar de administrador 4",
    },
  ],
};

export function getAvatarByKey(role, avatarKey) {
  const roleAvatars = profileAvatars[role] || [];

  return (
    roleAvatars.find((avatar) => avatar.key === avatarKey) ||
    roleAvatars[0] || {
      key: "default",
      src: "/avatars/default-avatar.webp",
      alt: "Avatar padrão",
    }
  );
}