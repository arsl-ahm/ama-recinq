import { pipeline, env } from '@huggingface/transformers';
import { useState, useRef } from 'react';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface UseLocalAIOptions {
  onProgress?: (progress: string) => void;
}

export function useLocalAI(options?: UseLocalAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const generatorRef = useRef<any>(null);

  const initializeModel = async () => {
    if (generatorRef.current) return;
    
    try {
      setIsLoading(true);
      options?.onProgress?.('Loading AI model (this may take a minute)...');
      
      // Use a better model for longer, more coherent responses
      generatorRef.current = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-base',
        { 
          device: 'cpu',
          dtype: 'fp32' // Better quality than quantized
        }
      );
      
      setIsInitialized(true);
      options?.onProgress?.('Model loaded successfully!');
    } catch (error) {
      console.error('Error initializing model:', error);
      options?.onProgress?.('Error loading model. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = async (question: string, context: string = ''): Promise<string> => {
    if (!generatorRef.current) {
      await initializeModel();
    }

    try {
      setIsLoading(true);
      
      const prompt = `Answer this question about Re:cinq in detail. Re:cinq is a company specializing in AI Native and Cloud Native technologies.

${context ? `Here is relevant information: ${context}` : ''}

Question: ${question}
Provide a comprehensive answer in 2-3 sentences:`;

      const result = await generatorRef.current(prompt, {
        max_new_tokens: 300,
        temperature: 0.7,
        do_sample: true,
        top_p: 0.9,
      });

      return result[0]?.generated_text || "I apologize, but I couldn't generate a response at this time.";
    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm having trouble generating a response right now. Please try again.";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateResponse,
    isLoading,
    isInitialized,
    initializeModel,
  };
}