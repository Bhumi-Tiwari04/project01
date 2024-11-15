const express = require("express");
const mongoose = require('mongoose');

// Define the schema
const assignmentSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true,
        trim: true, // Remove whitespace from both ends
    },
    course: {
        type: String,
        required: true,
        trim: true, // Remove whitespace from both ends
    },
    assignmentPaper: {
        type: String,  // This can hold the title or a brief description of the assignment
        required: true,
        trim: true,
    },
    file: {
        type: String,  // Assuming file is stored as a URL or file path
        required: true,
        trim: true,
    },
    
});

// Export the model
module.exports = mongoose.model('Assignment', assignmentSchema);
