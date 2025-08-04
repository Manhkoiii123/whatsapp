const twilio = require("twilio");
const dotenv = require("dotenv");
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const client = twilio(accountSid, authToken);

const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    console.log("this is res", response);
    return response;
  } catch (error) {
    throw error;
  }
};
const verifyOtp = async (phoneNumber, otp) => {
  try {
    const res = await client.verify
      .services(serviceSid)
      .verificationChecks.create({ to: `${phoneNumber}`, code: otp });
    console.log("res", res);
    return res;
  } catch (error) {
    throw error;
  }
};
module.exports = { sendOtpToPhoneNumber, verifyOtp };
