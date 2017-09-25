/*
*
* 评论数据模型
*
*/

const mongoose = require('../mongodb').mongoose;
const autoIncrement = require('mongoose-auto-increment');
const mongoosePaginate = require('mongoose-paginate');

// 自增ID初始化
autoIncrement.initialize(mongoose.connection);

// 标签模型
const commentSchema = new mongoose.Schema({

	// 评论所在的文章_id，0代表系统留言板
	post_id: { type: Number, required: true },

	// pid，0代表默认留言
	pid: { type: Number, default: 0 },

	// content
	content: { type: String, required: true, validate: /\S+/ },

	// 被赞数
	likes: { type: Number, default: 0 },

	// 评论产生者
	author: {
		name: { type: String, required: true, validate: /\S+/ },
		email: { type: String, required: true, validate: /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/ },
		site: { type: String, validate: /^((https|http):\/\/)+[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/ }
	},

  // 状态 0待审核 1通过正常 2不通过
  state: { type: Number, default: 1 },

	// 发布日期
	create_at: { type: Date, default: Date.now },

	// 最后修改日期
	update_at: { type: Date }
});

// 翻页 + 自增ID插件配置
commentSchema.plugin(mongoosePaginate)
commentSchema.plugin(autoIncrement.plugin, {
	model: 'Comment',
	field: 'id',
	startAt: 1,
	incrementBy: 1
});

// 时间更新
commentSchema.pre('findOneAndUpdate', function(next) {
	this.findOneAndUpdate({}, { update_at: Date.now() });
	next();
});

// 标签模型
const Comment = mongoose.model('Comment', commentSchema);

// export
module.exports = Comment;
