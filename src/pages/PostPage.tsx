import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip,
  Button,
  Divider,
  Avatar,
} from '@nextui-org/react';
import { 
  Calendar,
  Clock,
  Tag,
  Edit,
  Trash,
  ArrowLeft,
  Share
} from 'lucide-react';
import { apiService, Post } from '../services/apiService';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface PostPageProps {
  isAuthenticated?: boolean;
  currentUserId?: string;
}

const PostPage: React.FC<PostPageProps> = ({ 
  isAuthenticated,
  currentUserId
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        if (!id) throw new Error('Post ID is required');
        const fetchedPost = await apiService.getPost(id);
        setPost(fetchedPost);
        setError(null);
      } catch (err) {
        setError('Failed to load the post. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleDelete = async () => {
    if (!post || !window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await apiService.deletePost(post.id);
      navigate('/');
    } catch (err) {
      setError('Failed to delete the post. Please try again later.');
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: post?.title,
        text: post?.content.substring(0, 100) + '...',
        url: window.location.href,
      });
    } catch (err) {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const createSanitizedHTML = (content: string) => {
    return {
      __html: DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'br','h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
      })
    };
  };

  const keyGemini = "AIzaSyBDtIUznabAX_inOIqkN-7SLKfDBB6H08o"; 

  useEffect(() => {
    if (summary && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [summary]);

  const handleGenerateSummary = async () => {
  if (!post) return;

  try {
    setLoadingSummary(true);

    const prompt = `
Tu es un assistant chargé de résumer un article de blog.
Le texte fourni est en HTML.
Renvoie un résumé clair, structuré et 100% en HTML utilisant uniquement:
<h2>, <p>, <ul>, <li>, <strong>, <em>.

Ne dépasse pas 200 mots.

Texte original :
${post.content}
`;

    const genAI = new GoogleGenerativeAI('AIzaSyBDtIUznabAX_inOIqkN-7SLKfDBB6H08o');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Generated Summary:", text);
    setSummary(text);
  } catch (error) {
    setSummary("<p style='color:red'>Erreur lors de la génération du résumé.</p>");
  } finally {
    setLoadingSummary(false);
  }
};

const handleGenerateSummary2 = async () => {
  if (!post) return;
  setLoadingSummary(true);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyGemini}`;

  const requestBody = {
    contents: [{
      parts: [{ text: `Résume cet article en HTML (h2, p, ul, li): ${post.content}` }]
    }]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.error) {
       throw new Error(data.error.message);
    }

    const text = data.candidates[0].content.parts[0].text;
    setSummary(text.replace(/```html|```/g, "").trim());
  } catch (error) {
    console.error("Erreur détaillée:", error);
    setSummary("<p style='color:red'>Erreur de connexion à l'API.</p>");
  } finally {
    setLoadingSummary(false);
  }
};

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <Card className="w-full animate-pulse">
          <CardBody>
            <div className="h-8 bg-default-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-default-200 rounded w-full"></div>
              <div className="h-4 bg-default-200 rounded w-full"></div>
              <div className="h-4 bg-default-200 rounded w-2/3"></div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardBody>
            <p className="text-danger">{error || 'Post not found'}</p>
            <Button
              as={Link}
              to="/"
              color="primary"
              variant="flat"
              startContent={<ArrowLeft size={16} />}
              className="mt-4"
            >
              Back to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-start gap-3">
          <div className="flex justify-between w-full">
            <Button
              as={Link}
              to="/"
              variant="flat"
              startContent={<ArrowLeft size={16} />}
              size="sm"
            >
              Back to Posts
            </Button>
            <div className="flex gap-2">
              {isAuthenticated && (
                <>
                  <Button
                    as={Link}
                    to={`/posts/${post.id}/edit`}
                    color="primary"
                    variant="flat"
                    startContent={<Edit size={16} />}
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<Trash size={16} />}
                    onClick={handleDelete}
                    isLoading={isDeleting}
                    size="sm"
                  >
                    Delete
                  </Button>
                </>
              )}
              <Button
                variant="flat"
                startContent={<Share size={16} />}
                onClick={handleShare}
                size="sm"
              >
                Share
              </Button>
              <Button
                variant="flat"
                color="secondary"
                onClick={handleGenerateSummary}
                isLoading={loadingSummary}
                size="sm"
            >
                Generate AI Summary
            </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar
                name={post.author?.name}
                size="sm"
              />
              <span className="text-default-600">{post.author?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-default-500">
              <Calendar size={16} />
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-default-500">
              <Clock size={16} />
              <span>{post.readingTime} min read</span>
            </div>
          </div>
        </CardHeader>

        <Divider />

        <CardBody>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={createSanitizedHTML(post.content)}
          />
        </CardBody>

        <CardFooter className="flex flex-col items-start gap-4">
          <Divider />
          <div className="w-full flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Chip color="primary" variant="flat">
                {post.category.name}
              </Chip>
              {post.tags.map((tag) => (
                <Chip
                  key={tag.id}
                  variant="flat"
                  startContent={<Tag size={14} />}
                >
                  {tag.name}
                </Chip>
              ))}
            </div>
            <Button
                variant="flat"
                color="secondary"
                onClick={handleGenerateSummary}
                isLoading={loadingSummary}
                size="sm"
            >
                Generate AI Summary
            </Button>
          </div>  
        </CardFooter>
      </Card>
      {summary && (
  <div
    ref={summaryRef}
    className="mt-6 w-full animate-fade-slide"
  >
    <Card className="w-full border border-default-200">
      <CardHeader>
        <h2 className="text-xl font-semibold">AI Summary</h2>
      </CardHeader>
      <Divider />
      <CardBody>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={createSanitizedHTML(summary)}
        />
      </CardBody>
    </Card>
  </div>
)}
    </div>
  );
};

export default PostPage;