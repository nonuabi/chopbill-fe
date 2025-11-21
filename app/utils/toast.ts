/**
 * Extracts user-friendly error message from API response
 */
export const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      
      // Try different error message formats from backend
      if (data?.message) {
        return data.message;
      }
      if (data?.error) {
        // If error is an object with message
        if (typeof data.error === "object" && data.error.message) {
          return data.error.message;
        }
        // If error is a string
        if (typeof data.error === "string") {
          return data.error;
        }
      }
      if (data?.errors) {
        // Handle validation errors (array or object)
        if (Array.isArray(data.errors)) {
          return data.errors.join(", ");
        }
        if (typeof data.errors === "object") {
          return Object.values(data.errors).flat().join(", ");
        }
      }
      if (data?.status?.message) {
        return data.status.message;
      }
    }
    
    // Fallback to status text
    return response.statusText || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
};

/**
 * Gets user-friendly error message based on status code
 */
export const getStatusErrorMessage = (status: number): string => {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input and try again.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 422:
      return "Validation failed. Please check your input.";
    case 500:
      return "Server error. Please try again later.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
};

/**
 * Formats success messages for different actions
 */
export const getSuccessMessage = (action: string): string => {
  const messages: Record<string, string> = {
    create_group: "Group created successfully! 🎉",
    update_group: "Group updated successfully! ✨",
    create_expense: "Expense added successfully! 💰",
    update_profile: "Profile updated successfully! 👤",
    accept_invite: "You've joined the group! 🎊",
    share_invite: "Invite link copied! Share it with your friends 📤",
    settle_up: "Settled up successfully! ✅",
  };
  return messages[action] || "Operation completed successfully! ✅";
};

