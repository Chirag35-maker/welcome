import { useState, useEffect } from "react";
import { Form, useSubmit } from "@remix-run/react";

export function EmailCollector() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const submit = useSubmit();

  // Show popup after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/collect-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setEmail("");
        setIsOpen(false);
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      setStatus("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
        <p className="mb-4">Get the latest updates and exclusive offers!</p>
        
        <Form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting..." : "Subscribe"}
            </button>
          </div>
        </Form>

        {status === "success" && (
          <p className="mt-4 text-green-600">Thank you for subscribing!</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-600">Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  );
} 