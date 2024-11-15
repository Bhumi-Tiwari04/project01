const mongoose = require('mongoose');

// Define the schema for the file
const fileSchema = new mongoose.Schema({
  studentName: { 
    type: String, 
    required: true, // To track who submitted the file
    trim: true,
  },
  course: { 
    type: String, 
    required: true, // To track which course the assignment belongs to
    trim: true,
  },
  assignmentTitle: { 
    type: String, 
    required: true, // To track the assignment the file belongs to
    trim: true,
  },
  filename: { 
    type: String, 
    required: true, // The actual name of the file
    trim: true,
  },
  description: { 
    type: String, 
    required: true, // A description of the file or assignment
    trim: true,
  },
  fileData: { 
    type: Buffer, 
    required: true, // Store binary data of the file
  },
  contentType: { 
    type: String, 
    required: true, // MIME type (e.g., 'application/pdf', 'image/png', etc.)
    trim: true,
  },
  submissionDate: { 
    type: Date, 
    default: Date.now, // Automatically set the current date/time
  },
});

module.exports = mongoose.model('File', fileSchema);
