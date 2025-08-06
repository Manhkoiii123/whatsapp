import { useEffect, useState } from "react";
import ChatList from "../pages/chatSection/ChatList";
import useLayoutStore from "../store/layoutStore";
import Layout from "./Layout";
import { motion } from "framer-motion";
import { getAllUsers } from "../services/user.service";
const HomePage = () => {
  const [allUsers, setAllUsers] = useState([]);

  const getUser = async () => {
    try {
      const res = await getAllUsers();
      if (res.status === "success") setAllUsers(res.data);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getUser();
  }, []);
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  );
};

export default HomePage;
