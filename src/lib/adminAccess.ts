import { getAuthEmail, getAuthRole, getUserByEmail } from "@/lib/api";

export async function hasAdminAccess(): Promise<boolean> {
  const storedRole = getAuthRole();
  if (typeof storedRole === "string" && storedRole.toLowerCase() === "admin") {
    return true;
  }

  const email = getAuthEmail();
  if (!email) {
    return false;
  }

  try {
    const user = await getUserByEmail(email);
    return typeof user.role === "string" && user.role.toLowerCase() === "admin";
  } catch {
    return false;
  }
}
