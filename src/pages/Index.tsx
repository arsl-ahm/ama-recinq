import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Brain, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalAI } from "@/hooks/useLocalAI";

interface Message {
  id: string;
  question: string;
  answer: string;
  sources?: Array<{
    id: string;
    title: string;
    url?: string;
  }>;
  timestamp: Date;
}

const Index = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const { toast } = useToast();
  const { generateResponse, isLoading, isInitialized, initializeModel } = useLocalAI({
    onProgress: setLoadingProgress
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();
    setQuestion('');

    try {
      // Search for relevant knowledge from our sources
      const { data: sources, error: sourcesError } = await supabase
        .from('knowledge_sources')
        .select('*')
        .textSearch('content', currentQuestion, { type: 'websearch' });

      if (sourcesError) {
        console.error('Error searching knowledge sources:', sourcesError);
      }

      let answer = '';

      if (isInitialized) {
        // Use AI if model is loaded
        const context = sources?.map(source => 
          `Source: ${source.title} (${source.url})\nContent: ${source.content}`
        ).join('\n\n') || '';
        
        answer = await generateResponse(currentQuestion, context);
      } else {
        // Simple keyword-based response if no AI model
        if (sources && sources.length > 0) {
          answer = `Based on the available information:\n\n${sources.map(source => 
            `• ${source.title}: ${source.content.substring(0, 200)}...`
          ).join('\n\n')}`;
        } else {
          answer = "I found some relevant information, but for the best experience with AI-powered responses, please load the AI assistant above. For now, try rephrasing your question with different keywords.";
        }
      }

      const newMessage: Message = {
        id: crypto.randomUUID(),
        question: currentQuestion,
        answer,
        sources: sources || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);

      // Store the conversation
      const sourceIds = sources?.map(s => s.id) || [];
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          question: currentQuestion,
          answer,
          sources_used: sourceIds,
          session_id: crypto.randomUUID(),
        });

      if (insertError) {
        console.error('Error storing conversation:', insertError);
      }
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Re:cinq Knowledge Base
            </h1>
          </div>
          <div className="text-center mb-4">
            {!isInitialized ? (
              loadingProgress ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                    {loadingProgress}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    First-time setup downloads a small AI model (~50MB). This enables completely free, offline responses.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    onClick={initializeModel}
                    disabled={isLoading}
                    className="mb-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading AI Model...
                      </>
                    ) : (
                      "🤖 Load Free AI Assistant"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This downloads a small AI model to your browser for completely free, private responses. 
                    Or you can ask questions using simple keyword matching below.
                  </p>
                </div>
              )
            ) : null}
          </div>
          <p className="text-lg text-muted-foreground">
            {isInitialized ? 
              "🚀 AI Assistant ready! Ask me anything about Re:cinq" :
              "Choose AI mode above or ask questions using keyword search below"
            }
          </p>
        </div>

        {/* Question Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about Re:cinq?"
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !question.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Conversation History */}
        <div className="space-y-6">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to help!</h3>
                <p className="text-muted-foreground">
                  Ask me about Re:cinq's services, methodologies, or anything from their knowledge base.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Sample questions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• What services does Re:cinq offer?</li>
                      <li>• How do they help with AI Native transformation?</li>
                      <li>• What is the Waves of Innovation community?</li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Topics covered:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Cloud Native expertise</li>
                      <li>• AI automation and workflows</li>
                      <li>• Platform engineering</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{message.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="max-h-96">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">{message.answer}</p>
                    </div>
                  </ScrollArea>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                        Sources referenced:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <Button
                            key={source.id}
                            variant="outline"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => source.url && window.open(source.url, '_blank')}
                            disabled={!source.url}
                          >
                            {source.title}
                            {source.url && <ExternalLink className="h-3 w-3 ml-1" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
