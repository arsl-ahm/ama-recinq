-- Create knowledge base tables for Re:cinq AMA system

-- Table for storing document sources
CREATE TABLE public.knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'website', -- website, pdf, doc, etc
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing chunked content for semantic search
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing conversations and questions
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  sources_used UUID[] DEFAULT '{}',
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (knowledge base is public)
CREATE POLICY "Knowledge sources are publicly readable" 
ON public.knowledge_sources 
FOR SELECT 
USING (true);

CREATE POLICY "Knowledge chunks are publicly readable" 
ON public.knowledge_chunks 
FOR SELECT 
USING (true);

CREATE POLICY "Conversations are publicly readable" 
ON public.conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_knowledge_chunks_source_id ON public.knowledge_chunks(source_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversations_session_id ON public.conversations(session_id);

-- Insert the Re:cinq content we fetched
INSERT INTO public.knowledge_sources (title, url, source_type, content, metadata) VALUES
('Re:cinq Homepage', 'https://re-cinq.com/', 'website', 'Amplify business impact with re:cinq. AI and Cloud Native Expertise, delivered. We empower businesses to innovate faster, operate more efficiently, and unlock untapped value by integrating the intelligence of Artificial Intelligence with the agility and scalability of Cloud Native technologies.', '{"section": "homepage"}'),
('Waves of Innovation Newsletter', 'https://re-cinq.com/newsletter', 'website', 'Every Tuesday, we deliver one short, powerful read on AI Native to help you lead better, adapt faster, and build smarter—based on decades of experience helping teams transform for real.', '{"section": "newsletter"}'),
('Waves of Innovation Community', 'https://re-cinq.com/waves-of-innovation', 'website', 'A community for technology leaders navigating the transition from Cloud Native to AI Native — through a podcast, newsletter, and practical resources.', '{"section": "community"}'),
('Re:cinq Blog', 'https://re-cinq.com/blog', 'website', 'Latest articles and insights about Cloud Native and AI Native technologies including AI-powered automation, n8n workflows, MCP, Kubernetes, and AI Native concepts.', '{"section": "blog"}');