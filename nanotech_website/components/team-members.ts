export type TeamMember = {
  name: string
  major: string
  team: string
  year: "PI" | "Senior" | "Junior" | "Sophomore" | "Freshman"
  email: string
  funFact: string
  image: string
  gradient: string
}

export const teamMembers: TeamMember[] = [
  {
    name: "Dr. Waqas Khalid",
    major: "Principal Investigator",
    team: "Leadership/PI",
    year: "PI",
    email: "waqask@berkeley.edu",
    funFact: "Principal Investigator leading the lab.",
    image: "/team/waqas-khalid.jpg",
    gradient: "from-orange-400 to-red-400"
  },
  {
    name: "Arda Hoke",
    major: "Computer Science",
    team: "Software/ML/Analysis",
    year: "Senior",
    email: "hoke@berkeley.edu",
    funFact: "I can drive, sail, and fly.",
    image: "/team/arda-hoke.jpg",
    gradient: "from-blue-400 to-cyan-400"
  },
  {
    name: "Jamshaid Ali",
    major: "Applied Mathematics and Statistics",
    team: "Software/ML/Analysis",
    year: "Senior",
    email: "jam_a@berkeley.edu",
    funFact: "I was born in a state that I have never lived in.",
    image: "/team/jamshaid-ali.jpg",
    gradient: "from-green-400 to-emerald-400"
  },
  {
    name: "Achyut S. Chebiyam",
    major: "Engineering Physics + EECS",
    team: "Project/Operations",
    year: "Senior",
    email: "achebiyam@berkeley.edu",
    funFact: "I have a 2nd Degree Black Belt in Taekwondo/MMA.",
    image: "/team/achyut-chebiyam.jpg",
    gradient: "from-blue-400 to-cyan-400"
  },
  {
    name: "Seoyun Kim",
    major: "EECS + IEOR",
    team: "Energy Storage",
    year: "Junior",
    email: "saykim@berkeley.edu",
    funFact: "Almost blew up Stanley Hall after putting too much voltage.",
    image: "/team/seoyun-kim.jpg",
    gradient: "from-teal-400 to-cyan-400"
  },
  {
    name: "Luke Huang",
    major: "Molecular Cell Biology",
    team: "Biosensing",
    year: "Junior",
    email: "lhuang726@berkeley.edu",
    funFact: "Huge Lakers fan; favorite player is Kobe Bryant.",
    image: "/team/luke-huang.jpg",
    gradient: "from-pink-400 to-rose-400"
  },
  {
    name: "Yahya Mirza",
    major: "Mechanical Engineering",
    team: "Exoskeleton",
    year: "Junior",
    email: "yahyam0626@gmail.com",
    funFact: "I can speak Japanese.",
    image: "/team/yahya-mirza.jpg",
    gradient: "from-green-400 to-emerald-400"
  },
  {
    name: "Ahmed Nagi",
    major: "Aerospace Engineering",
    team: "Exoskeleton",
    year: "Junior",
    email: "ahmednagi309@berkeley.edu",
    funFact: "I love hiking and reading non-fiction.",
    image: "/team/ahmed-nagi.jpg",
    gradient: "from-teal-400 to-cyan-400"
  },
  {
    name: "Inez Alvarez",
    major: "EECS",
    team: "Software/ML/Analysis",
    year: "Junior",
    email: "inez9@berkeley.edu",
    funFact: "My favorite hobby is painting.",
    image: "/team/inez-alvarez.jpg",
    gradient: "from-amber-400 to-yellow-400"
  },
  {
    name: "Omar Esquivel",
    major: "Applied Mathematics",
    team: "Biosensing",
    year: "Junior",
    email: "omaresquivel@berkeley.edu",
    funFact: "I speak French, English, Spanish, and Tunisian Arabic.",
    image: "/team/omar-esquivel.jpg",
    gradient: "from-purple-400 to-pink-400"
  },
  {
    name: "Hammaad Hassan",
    major: "Material Science and Engineering",
    team: "Materials/Hardware",
    year: "Junior",
    email: "hammaadhassan@berkeley.edu",
    funFact: "National percussionist.",
    image: "/team/hammaad-hassan.jpg",
    gradient: "from-amber-400 to-yellow-400"
  },
  {
    name: "Arjun Dosanjh",
    major: "MCB/Public Health",
    team: "Exoskeleton",
    year: "Junior",
    email: "arjundosanjh@berkeley.edu",
    funFact: "I drink way too much caffeine.",
    image: "/team/arjun-dosanjh.jpg",
    gradient: "from-orange-400 to-red-400"
  },
  {
    name: "Rowan George",
    major: "Physics",
    team: "Energy Storage",
    year: "Junior",
    email: "rowanwg@berkeley.edu",
    funFact: "I believe I am on the path of least action.",
    image: "/team/rowan-george.jpg",
    gradient: "from-amber-400 to-yellow-400"
  },
  {
    name: "Jeffrey Kwan",
    major: "Mechanical Engineering",
    team: "Exoskeleton",
    year: "Sophomore",
    email: "jeffrey_kwan@berkeley.edu",
    funFact: "Down to play table tennis.",
    image: "/team/jeffrey-kwan.jpg",
    gradient: "from-orange-400 to-red-400"
  },
  {
    name: "Xinxian Wang",
    major: "Material Science Engineering",
    team: "Biosensing",
    year: "Sophomore",
    email: "xinxian_wang@berkeley.edu",
    funFact: "By some definition, I am ambidextrous.",
    // Future reference: using "Image_20251204160009_159_2 - Jason Wang.jpg" as the current source image.
    image: "/team/xinxian-wang.jpg",
    gradient: "from-indigo-400 to-blue-400"
  },
  {
    name: "Nadia Liu",
    major: "Mechanical Engineering",
    team: "Exoskeleton",
    year: "Sophomore",
    email: "nadialiu@berkeley.edu",
    funFact: "I have three passports!",
    image: "/team/nadia-liu.jpg",
    gradient: "from-cyan-400 to-blue-400"
  },
  {
    name: "Abhishek Roy",
    major: "Computer Science",
    team: "Software/ML/Analysis",
    year: "Sophomore",
    email: "abhishek_roy@berkeley.edu",
    funFact: "I somehow make every waiter in every country remember me.",
    image: "/team/abhishek-roy.jpg",
    gradient: "from-green-400 to-emerald-400"
  },
  {
    name: "Dilan Mummert",
    major: "Molecular and Cellular Biology",
    team: "Biosensing",
    year: "Sophomore",
    email: "dilan_mummert@berkeley.edu",
    funFact: "I've traveled to over 30 countries.",
    image: "/team/dilan-mummert.jpg",
    gradient: "from-violet-400 to-purple-400"
  },
  {
    name: "Varun Venkatesh",
    major: "Applied Mathematics and Political Science",
    team: "Project/Operations",
    year: "Sophomore",
    email: "varunvenkatesh@berkeley.edu",
    funFact: "I love LeBron.",
    image: "/team/varun-venkatesh.jpg",
    gradient: "from-amber-400 to-yellow-400"
  },
  {
    name: "Wenrui Hu",
    major: "Mathematics & Theater Performance Studies",
    team: "Biosensing",
    year: "Sophomore",
    email: "huwenrui@berkeley.edu",
    funFact: "My original life plan was to write novels. Now I prove things instead.",
    image: "/team/wenrui-hu.jpg",
    gradient: "from-blue-400 to-cyan-400"
  },
  {
    name: "Anne Medina",
    major: "Operations Research and Management Science/Analytics",
    team: "Project/Operations",
    year: "Sophomore",
    email: "anniemedina679@berkeley.edu",
    funFact: "I learned how to skateboard in a week!",
    image: "/team/anne-medina.jpg",
    gradient: "from-green-400 to-emerald-400"
  },
  {
    name: "Qinyu Zheng",
    major: "BioE",
    team: "Biosensing",
    year: "Freshman",
    email: "cherry2006@berkeley.edu",
    funFact: "I have a scuba diver license.",
    image: "/team/qinyu-zheng.jpg",
    gradient: "from-teal-400 to-cyan-400"
  },
  {
    name: "Ruhi Samudra",
    major: "Bioengineering",
    team: "Biosensing",
    year: "Freshman",
    email: "ruhi.samudra@berkeley.edu",
    funFact: "I love watching sports!",
    image: "/team/ruhi-samudra.jpg",
    gradient: "from-cyan-400 to-blue-400"
  },
  {
    name: "Raneem Siyam",
    major: "Materials Science Engineering & Mechanical Engineering",
    team: "Exoskeleton",
    year: "Freshman",
    email: "raneemsiyam@berkeley.edu",
    funFact: "I speak 4 languages!",
    image: "/team/raneem-siyam.jpg",
    gradient: "from-orange-400 to-red-400"
  },
  {
    name: "Janak Bhuta",
    major: "Mechanical Engineering",
    team: "Exoskeleton",
    year: "Freshman",
    email: "janakbhuta@berkeley.edu",
    funFact: "I play the cello!",
    image: "/team/janak-bhuta.jpg",
    gradient: "from-pink-400 to-rose-400"
  },
  {
    name: "Naomi Lojo",
    major: "Applied Math",
    team: "Exoskeleton",
    year: "Freshman",
    email: "naomilojo@berkeley.edu",
    funFact: "I've traveled to 21 countries.",
    image: "/team/naomi-lojo.jpg",
    gradient: "from-indigo-400 to-blue-400"
  },
  {
    name: "Evana Thomson",
    major: "EECS, minor in MSE",
    team: "E-beam Lithography",
    year: "Freshman",
    email: "evana@berkeley.edu",
    funFact: "I've fractured my left wrist three times.",
    image: "/team/evana-thomson.jpg",
    gradient: "from-cyan-400 to-blue-400"
  },
  {
    name: "Doga Arier",
    major: "BioE",
    team: "Biosensing",
    year: "Freshman",
    email: "doga@berkeley.edu",
    funFact: "I have 4 dogs!",
    image: "/team/doga-arier.jpg",
    gradient: "from-violet-400 to-purple-400"
  },
  {
    name: "Logan Fleming",
    major: "EECS",
    team: "E-beam Lithography",
    year: "Freshman",
    email: "logan.fleming@berkeley.edu",
    funFact: "I love traveling to new places and trying new things!",
    image: "/team/logan-fleming.jpg",
    gradient: "from-pink-400 to-rose-400"
  },
  {
    name: "Aidan Lacayo",
    major: "Materials Science and Engineering",
    team: "Materials/Hardware",
    year: "Freshman",
    email: "ablacayo13@berkeley.edu",
    funFact: "I was a flag holder in the Super Bowl for Charlie Puth's national anthem!",
    image: "/team/aidan-lacayo.jpg",
    gradient: "from-indigo-400 to-blue-400"
  },
  {
    name: "Peter Harrison DeGraziano",
    major: "Materials Science and Engineering",
    team: "Energy Storage",
    year: "Freshman",
    email: "phdegraz@berkeley.edu",
    funFact: "I like photography and video editing.",
    image: "/team/peter-degraziano.jpg",
    gradient: "from-teal-400 to-cyan-400"
  }
]
