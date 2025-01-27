const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const {convertSecondsToDuration} = require("../utils/secToDuration")
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");
// Method for updating a profile
exports.updateProfile = async (req, res) => {
	try {
		const { dateOfBirth = "", about = "", contactNumber } = req.body;
		const id = req.user.id;

		// Find the profile by id
		const userDetails = await User.findById(id);
		const profile = await Profile.findById(userDetails.additionalDetails);

		// Update the profile fields
		profile.dateOfBirth = dateOfBirth;
		profile.about = about;
		profile.contactNumber = contactNumber;

		// Save the updated profile
		await profile.save();

		return res.json({
			success: true,
			message: "Profile updated successfully",
			profile,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

exports.deleteAccount = async (req, res) => {
	try {
		// TODO: Find More on Job Schedule
		// const job = schedule.scheduleJob("10 * * * * *", function () {
		// 	console.log("The answer to life, the universe, and everything!");
		// });
		// console.log(job);
		console.log("Printing ID: ", req.user.id);
		const id = req.user.id;
		
		const user = await User.findById({ _id: id });
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}
		// Delete Assosiated Profile with the User
		await Profile.findByIdAndDelete({ _id: user.additionalDetails });
		// TODO: Unenroll User From All the Enrolled Courses
		// Now Delete User
		await User.findByIdAndDelete({ _id: id });
		res.status(200).json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		console.log(error);
		res
			.status(500)
			.json({ success: false, message: "User Cannot be deleted successfully" });
	}
};

exports.getAllUserDetails = async (req, res) => {
	try {
		const id = req.user.id;
		const userDetails = await User.findById(id)
			.populate("additionalDetails")
			.exec();
		console.log(userDetails);
		res.status(200).json({
			success: true,
			message: "User Data fetched successfully",
			data: userDetails,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(image)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};
  
exports.getEnrolledCourses = async (req, res) => {
    try {
      const userId = req.user.id
      const userDetails = await User.findOne({
        _id: userId,
      })
      .populate({
        path: "courses", // Populate courses
        populate: {
          path: "courseContent", // Populate courseContent (sections)
          select: "sectionName subSection", // Include sectionName and subSection fields
          populate: {
            path: "subSection", // Populate subSection (if it contains object IDs)
            select: "title timeDuration", // Include specific fields from subSection
          },
        },
      })
        .exec()

	const userDetailsObject = userDetails.toObject();
	console.log("userdetailsobject",userDetailsObject)
let SubsectionLength = 0;
   
for (let i = 0; i < userDetailsObject.courses.length; i++) {
  let totalDurationInSeconds = 0;
  SubsectionLength = 0;
  const CourseId = userDetailsObject.courses[i]._id;
  console.log("courseId",CourseId)
  const courseContent = userDetailsObject.courses[i].courseContent || [];
  for (let j = 0; j < courseContent.length; j++) {
    const subSections = courseContent[j]?.subSection || [];
    totalDurationInSeconds += subSections.reduce((acc, curr) => acc + parseInt(curr.timeDuration || 0), 0);
	  console.log("totalduration bta de kitna hia",totalDurationInSeconds);
    SubsectionLength += subSections.length;
  }

  userDetailsObject.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds);

  let courseProgressCount = await CourseProgress.findOne({
    courseID: userDetailsObject.courses[i]._id,
    // userId: userId,
  });
  courseProgressCount = courseProgressCount?.completedVideos?.length || 0;
  // console.log("course progress count",courseProgressCount);



  if (SubsectionLength === 0) {
    userDetailsObject.courses[i].progressPercentage = 100;
    await User.findByIdAndUpdate(CourseId,{
      push:{
        progressPercentage:userDetailsObject.courses[i].progressPercentage,
      }
    })
  } else {
    const multiplier = Math.pow(10, 2);
    userDetailsObject.courses[i].progressPercentage =
      Math.round((courseProgressCount / SubsectionLength) * 100 * multiplier) / multiplier;
      await Course.findByIdAndUpdate(CourseId,{
        push:{
          progressPercentage:userDetailsObject.courses[i].progressPercentage,
        }
      })
  // console.log("course percentage",userDetailsObject.courses[i].progressPercentage);
    }
}

      if (!userDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find user with id: ${userDetails}`,
        })
      }
      return res.status(200).json({
        success: true,
        data: userDetails.courses,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};

exports.instructorDshboard = async(req,res) => {
  try{
    const courseDetails = await Course.find({instructor:req.user.id});

    const courseData = courseDetails.map((course)=> {
      const totalStudentsEnrolled = course.studentsEnrolled.length;
      const totalAmountGenerated = totalStudentsEnrolled + courseDetails.price;
  
      // create a new object with additional field
      const courseDataWithStats = {
        _id: course._id,
        courseName:course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      }
  
      return courseDataWithStats;
    });
    // console.log("inbackend c",courseData)
    res.status(200).json({course:courseData});
    
  }
  catch(error){
    console.error(error);
    res.status(500).json({message:"internal seerver errror"});

  }
}