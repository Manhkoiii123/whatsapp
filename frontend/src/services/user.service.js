import axiosInstance from "./url.service";

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const res = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  try {
    const res = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      otp,
      email,
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (updateData) => {
  try {
    const res = await axiosInstance.put(`/auth/update-profile`, updateData);
    return res.data;
  } catch (error) {
    throw error;
  }
};
export const checkUserAuth = async () => {
  try {
    const res = await axiosInstance.get(`/auth/check-auth`);
    if (res.data.status === "success") {
      return {
        isAuthenticated: true,
        user: res.data?.data,
      };
    } else if (res.data.status === "error") {
      return {
        isAuthenticated: false,
      };
    }
  } catch (error) {
    throw error;
  }
};
export const logout = async () => {
  try {
    const res = await axiosInstance.post(`/auth/logout`);
    return res.data;
  } catch (error) {
    throw error;
  }
};
export const getAllUsers = async () => {
  try {
    const res = await axiosInstance.get(`/auth/users`);
    return res.data;
  } catch (error) {
    throw error;
  }
};
