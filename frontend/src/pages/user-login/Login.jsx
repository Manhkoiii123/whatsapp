import { useState } from "react";
import useLoginStore from "../../store/useLoginStore";
import countries from "../../utils/countriles";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { data, useNavigate } from "react-router-dom";
import useUserStore from "../../store/useUserStore";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/themeStore";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaChevronDown,
  FaChevronLeft,
  FaPlus,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import Spinner from "../../utils/Spinner";
import {
  sendOtp,
  updateUserProfile,
  verifyOtp,
} from "../../services/user.service";
import { toast } from "react-toastify";
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "phone number be digit")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .matches("Please enter a valid email")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
  })
  .test(
    "at-least-one",
    "At least one of phone number or email is required",
    (value) => {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object({
  otp: yup
    .string()
    .length(6, "OTP must be 6 digits")
    .required("OTP is required"),
});
const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  argeed: yup.bool().oneOf([true], "You must agree to terms and conditions"),
});
const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const { step, setStep, setUserPhoneData, resetLoginState, userPhoneData } =
    useLoginStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const { theme, setTheme } = useThemeStore();
  const nav = useNavigate();
  const { setUser } = useUserStore();
  const [searchTerm, setSearchTerm] = useState("");
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });
  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      if (email) {
        const res = await sendOtp(null, null, email);
        if (res.status === "success") {
          toast.info("OTP sent to your email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const res = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (res.status === "success") {
          toast.info("OTP sent to your phone number");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      setError(error.message || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };
  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone number or email is required");
      }
      const otpString = otp.join("");
      let res;
      if (userPhoneData.email) {
        res = await verifyOtp(null, null, otpString, userPhoneData.email);
      } else {
        res = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          otpString
        );
      }
      if (res.status === "success") {
        toast.success("OTP verified successfully");
        const user = res.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Logged in successfully");
          nav("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      }
    } catch (error) {
      setError(error.message || "Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("argeed", data.argeed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }
      await updateUserProfile(formData);
      toast.success("Profile updated successfully");
      nav("/");
      resetLoginState();
    } catch (error) {
      setError(error.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const hanldeOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue(`otp`, newOtp.join(""));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const ProgessBar = () => {
    return (
      <div
        className={`w-full ${
          theme === "dark" ? "bg-gray-700" : "bg-gray-200"
        } rounded-full h-2.5 mb-6`}
      >
        <div
          className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `${(step / 3) * 100}%`,
          }}
        ></div>
      </div>
    );
  };

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>
        <h1
          className={`text-3xl font-bold text-center  mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          WhatsApp Clone
        </h1>
        <ProgessBar />

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit(onLoginSubmit)}
          >
            <p
              className={`${
                theme === "light" ? "text-gray-600" : "text-gray-300"
              } text-center`}
            >
              Enter your phone number to receive an OTP
            </p>
            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    type="button"
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100`}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="Search..."
                          onChange={(e) => setSearchTerm(e.target.value)}
                          value={searchTerm}
                          className={`w-full px-2 py-1 border ${
                            theme === "dark "
                              ? "bg-gray-600 border-gray-500 "
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      {filterCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-200"
                          } focus:outline-none focus:ring-gray-100`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdown(false);
                          }}
                        >
                          {country.flag} ({country.dialCode}) {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  placeholder="Phone Number"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md  focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    loginErrors.phoneNumber
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </div>
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>
            <div className="flex items-center py-4">
              <div className="flex-grow h-px bg-gray-300"></div>
              <span className="mx-3 text-gray-500 text-sm font-medium">Or</span>
              <div className="flex-grow h-px bg-gray-300"></div>
            </div>
            <div
              className={`flex items-center border rounded-md px-3 py-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400 " : "text-gray-500"
                }`}
              />
              <input
                type="email"
                {...loginRegister("email")}
                value={email}
                placeholder="Email (Optional)"
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent ${
                  theme === "dark" ? " text-white" : "text-black"
                } rounded-md  focus:outline-none  ${
                  loginErrors.email ? "border-red-500" : ""
                }`}
              />
              {loginErrors.email && (
                <p className="text-red-500 text-sm">
                  {loginErrors.email.message}
                </p>
              )}
            </div>
            <button
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              type="submit"
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p
              className={`text-center mb-4 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Please enter the 6-digit otp sent to your{" "}
              {userPhoneData ? userPhoneData.phoneSuffix : "Email"}{" "}
              {userPhoneData && userPhoneData.phoneNumber}
            </p>
            <div className="flex justify-between">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => hanldeOtpChange(index, e.target.value)}
                  className={`w-12 h-12 text-center border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    otpErrors.otp ? "border-red-500" : ""
                  }`}
                />
              ))}
            </div>
            {otpErrors.otp && (
              <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
            )}
            <button
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              type="submit"
            >
              {loading ? <Spinner /> : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className={`w-full mt-2 py-2 rounded-md hover:bg-gray-300 transition flex items-center justify-center ${
                theme === "dark"
                  ? "text-gray-300 bg-gray-700"
                  : "text-gray-700 bg-gray-200"
              }`}
            >
              <FaArrowLeft className="mr-2" />
              Wrong number? Go back
            </button>
          </form>
        )}
        {step === 3 && (
          <form
            className="space-y-4"
            onSubmit={handleProfileSubmit(onProfileSubmit)}
          >
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                <img
                  src={profilePicture || selectedAvatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
                <label
                  htmlFor="profile-picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer"
                >
                  <FaPlus />
                </label>
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                />
              </div>
              <p
                className={`text-sm mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                }`}
              >
                Chopose a profile picture
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {avatars.map((avatar, index) => (
                  <img
                    src={avatar}
                    alt=""
                    key={index}
                    className={`w-12 h-12 rounded-full cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-110 ${
                      selectedAvatar === avatar
                        ? "border-2 border-green-500"
                        : ""
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  />
                ))}
              </div>
              <div className="relative w-full">
                <FaUser
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}
                />
                <input
                  type="text"
                  {...profileRegister("username", {
                    required: "Username is required",
                    minLength: {
                      value: 3,
                      message: "Username must be at least 3 characters long",
                    },
                    maxLength: {
                      value: 20,
                      message: "Username must be at most 20 characters long",
                    },
                  })}
                  placeholder="Username"
                  className={`w-full py-2 pl-10 pr-3 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    profileErrors.username ? "border-red-500" : ""
                  }`}
                />
                {profileErrors.username && (
                  <p className="text-red-500 text-sm">
                    {profileErrors.username.message}
                  </p>
                )}
              </div>
              <div className="flex items-center mt-4 space-x-2">
                <input
                  type="checkbox"
                  {...profileRegister("argeed")}
                  className={`rounded ${
                    theme === "dark"
                      ? "text-green-500 bg-gray-700"
                      : "text-green-500"
                  } focus:ring-2 focus:ring-green-500`}
                />
                <label
                  htmlFor="terms"
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  I agree to the{" "}
                  <a href="#" className="text-red-500 hover:underline">
                    Terms of Service
                  </a>
                </label>
                {profileErrors.argeed && (
                  <p className="text-red-500 text-sm">
                    {profileErrors.argeed.message}
                  </p>
                )}
              </div>
              <button
                disabled={!watch("argeed") || loading}
                className="w-full bg-green-500 mt-4 text-white py-2 rounded-md hover:bg-green-600 transition"
                type="submit"
              >
                {loading ? <Spinner /> : "Create profile"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
