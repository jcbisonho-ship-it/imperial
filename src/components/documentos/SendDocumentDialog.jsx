import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { sendWhatsApp } from '@/lib/whatsapp';
import { sendEmail } from '@/services/emailService';
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import { generateDocumentPDF } from '@/services/pdfService';

const SendDocumentDialog = ({ isOpen, onClose, docData, type }) => {
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const docLabel = type === 'os' ? 'Ordem de Serviço' : 'Orçamento';
  const docNumber = type === 'os' ? docData?.os_number : docData?.budget_number;

  const phone = docData?.customer?.whatsapp || docData?.customer?.phone || "Não cadastrado";
  const email = docData?.customer?.email || "Não cadastrado";
  
  useEffect(() => {
    if(isOpen) {
        setMessage('');
        setLoading(false);
        // Set default channel based on availability
        if (phone !== "Não cadastrado") {
            setChannel('whatsapp');
        } else if (email !== "Não cadastrado") {
            setChannel('email');
        }
    }
  }, [isOpen, phone, email]);

  const handleSend = async () => {
    setLoading(true);
    try {
      if (channel === 'whatsapp') {
        const defaultMessage = `Olá, ${docData.customer.name}! Segue sua ${docLabel} Nº ${docNumber}.`;
        sendWhatsApp(phone, message || defaultMessage);
        toast({ title: "WhatsApp Aberto", description: "Verifique a nova aba para enviar a mensagem." });
      } else { // email
        toast({ 
            title: "Funcionalidade de E-mail", 
            description: "O envio por e-mail ainda não está implementado.",
            variant: "default"
        });
        // This part is commented out as per instructions, but is ready for future implementation
        /* 
        const pdfDoc = await generateDocumentPDF(docData.id, type);
        const pdfBase64 = pdfDoc.output('datauristring'); // or blob

        await sendEmail({
            to: email,
            subject: `${docLabel} #${docNumber}`,
            text: message || `Segue em anexo o seu ${docLabel}.`,
            attachments: [{
                filename: `${type}_${docNumber}.pdf`,
                content: pdfBase64.split('base64,')[1],
                encoding: 'base64'
            }]
        });
        toast({ title: "E-mail enviado!", description: "O documento foi enviado com sucesso." });
        */
      }
      onClose();
    } catch (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar {docLabel} #{docNumber}</DialogTitle>
          <DialogDescription>Escolha o canal e personalize a mensagem.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <RadioGroup value={channel} onValueChange={setChannel} className="grid grid-cols-2 gap-4">
            <div>
              <RadioGroupItem value="whatsapp" id="whatsapp" className="peer sr-only" disabled={phone === "Não cadastrado"} />
              <Label
                htmlFor="whatsapp"
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 ${phone === "Não cadastrado" ? 'border-muted bg-muted text-muted-foreground opacity-50 cursor-not-allowed' : 'border-muted bg-transparent hover:bg-accent peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 cursor-pointer'}`}
              >
                <MessageSquare className="mb-2 h-6 w-6 text-green-600" />
                WhatsApp
              </Label>
            </div>
            <div>
              <RadioGroupItem value="email" id="email" className="peer sr-only" disabled={email === "Não cadastrado"} />
              <Label
                htmlFor="email"
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 ${email === "Não cadastrado" ? 'border-muted bg-muted text-muted-foreground opacity-50 cursor-not-allowed' : 'border-muted bg-transparent hover:bg-accent peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer'}`}
              >
                <Mail className="mb-2 h-6 w-6 text-blue-600" />
                Email
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label>Mensagem Personalizada (Opcional)</Label>
            <Textarea 
              placeholder="A mensagem padrão será usada se este campo ficar em branco." 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              {channel === 'whatsapp' 
                ? `Enviando para: ${phone}`
                : `Enviando para: ${email}`
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSend} disabled={loading || (channel === 'whatsapp' && phone === "Não cadastrado") || (channel === 'email' && email === "Não cadastrado")}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendDocumentDialog;