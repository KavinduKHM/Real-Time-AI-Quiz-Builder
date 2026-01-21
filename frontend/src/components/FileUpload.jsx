import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile, createQuiz } from '../services/api';
import { toast } from 'react-hot-toast';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (validTypes.includes(selectedFile.type)) {
        if (selectedFile.size <= 10 * 1024 * 1024) { // 10MB
          setFile(selectedFile);
        } else {
          toast.error('File size must be less than 10MB');
        }
      } else {
        toast.error('Please upload PDF, DOC, or DOCX files only');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !title.trim()) {
      toast.error('Please provide a file and title');
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    try {
      // Step 1: Upload file
      toast.loading('Uploading file...');
      const uploadResponse = await uploadFile(file);
      const { fileUrl, text } = uploadResponse.data || {};
      setUploadProgress(50);
      
      // Step 2: Create quiz
      toast.loading('Generating quiz with AI...');
      const quizData = {
        title,
        description,
        fileUrl,
        fileText: text,
        numQuestions
      };

      const quizResponse = await createQuiz(quizData);
      const quiz = quizResponse.data?.quiz;
      setUploadProgress(100);

      toast.success('Quiz created successfully!');
      
      // Navigate to quiz room
      if (quiz) {
        navigate(`/quiz/${quiz.roomCode}`, {
          state: { quiz }
        });
      } else {
        toast.error('Quiz data was not returned from the server');
      }
      
      

    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(error.response?.data?.error || 'Failed to create quiz');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container my-4">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: '800px' }}>
        <h1 className="h3 fw-bold text-dark mb-4">
          Create AI-Powered Quiz
        </h1>

        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="mb-3">
            <label className="form-label">
              Quiz Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-control"
              placeholder="Enter quiz title"
              required
            />
          </div>

          {/* Description Input */}
          <div className="mb-3">
            <label className="form-label">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
              placeholder="Describe your quiz"
              rows="3"
            />
          </div>

          {/* File Upload */}
          <div className="mb-3">
            <label className="form-label">
              Upload Document *
            </label>
            <div className="border border-secondary border-dashed rounded p-4 text-center bg-light-subtle">
                <svg
                  className="mb-3"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="d-flex justify-content-center small text-muted mb-1">
                  <label className="btn btn-outline-primary btn-sm me-2 mb-0">
                    <span>Choose file</span>
                    <input
                      type="file"
                      className="d-none"
                      name="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  <span className="align-self-center">or drag and drop</span>
                </div>
                <p className="small text-muted mb-1">
                  PDF, DOC, DOCX up to 10MB
                </p>
                {file && (
                  <p className="small text-success mb-0">
                    ✓ Selected: <strong>{file.name}</strong>
                  </p>
                )}
              </div>
            </div>
          

          {/* Number of Questions */}
          <div className="mb-3">
            <label className="form-label">
              Number of Questions: {numQuestions}
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="form-range"
            />
            <div className="d-flex justify-content-between small text-muted mt-1">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mb-3">
              <div className="progress">
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <p className="small text-muted mt-2 mb-0">
                {uploadProgress < 50 ? 'Uploading file...' : 'Generating quiz with AI...'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100"
          >
            {loading ? 'Creating Quiz...' : 'Create Quiz'}
          </button>
        </form>
      </div>
    </div>
    
  );
};

export default FileUpload;