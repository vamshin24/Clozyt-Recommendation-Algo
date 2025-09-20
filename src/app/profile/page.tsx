import ProfileForm from "../../components/forms/ProfileForm"; // Ensure the file exists and is correctly referenced

const ProfilePage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <ProfileForm />
    </div>
  );
};

export default ProfilePage;