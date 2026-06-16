import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Get('conversations')
  getMyConversations(@CurrentUser() user: AuthUser) {
    return this.messagingService.getMyConversations(user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
  ) {
    return this.messagingService.getMessages(id, user.id, page ? +page : 1);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.sendMessage(id, user.id, dto);
  }

  @Post('conversations/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.markRead(id, user.id);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.getConversationDetails(id, user.id);
  }

  @Post('conversations/:id/members')
  addMember(
    @Param('id') id: string,
    @Body('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.addMember(id, targetUserId, user.id);
  }

  @Delete('conversations/:id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.removeMember(id, targetUserId, user.id);
  }

  @Patch('conversations/:id/pin')
  togglePin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.togglePin(id, user.id);
  }

  @Delete('conversations/:id')
  archiveConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.archiveConversation(id, user.id);
  }

  @Post('conversations/group')
  createGroup(
    @Body() body: { nom: string; memberIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createGroupConversation(user.id, body);
  }

  @Get('conversations/channels/suggestions')
  getSuggestedChannels(@CurrentUser() user: AuthUser) {
    return this.messagingService.getSuggestedChannels(user);
  }

  @Post('conversations/channel')
  createOrJoinChannel(
    @Body('channelKey') channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES',
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createOrJoinTerritoryChannel(user, channelKey);
  }

  @Patch('messages/:messageId')
  editMessage(
    @Param('messageId') messageId: string,
    @Body('contenu') contenu: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.editMessage(messageId, user.id, contenu);
  }

  @Delete('messages/:messageId')
  deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.deleteMessage(messageId, user.id);
  }

  @Post('conversations/private')
  createPrivate(
    @Body('userId') targetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createPrivateConversation(user.id, targetId);
  }

  @Get('search')
  searchMessages(
    @Query('q') query: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.searchMessages(query ?? '', user.id);
  }
}
